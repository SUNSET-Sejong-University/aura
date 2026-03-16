/**
 * AURA Puck – main.cpp
 *
 * Hardware: ESP32-S3
 * Peripherals:
 *   • PN532 NFC reader (I2C)
 *   • HX711 load-cell amplifier (digital GPIO)
 *
 * Responsibilities:
 *   1. Initialize I2C bus and both peripherals.
 *   2. Advertise itself on the local network via mDNS.
 *   3. Poll every POLL_INTERVAL_MS for NFC tag presence.
 *   4. Emit TAG_PLACED / TAG_REMOVED events over HTTP POST.
 *   5. Retry failed POST requests from a local FIFO queue.
 *   6. Reset via hardware watchdog if the main loop stalls.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <esp_task_wdt.h>
#include <ArduinoJson.h>

// PN532 – use I2C transport
#include <PN532_I2C.h>
#include <PN532.h>

// HX711
#include <HX711.h>

#include "config.h"

// ─── Peripheral objects ────────────────────────────────────────────────────
PN532_I2C pn532_i2c(Wire);
PN532     nfc(pn532_i2c);
HX711     scale;

// ─── State ────────────────────────────────────────────────────────────────
static String  currentTagUID      = "";
static bool    tagPresent         = false;
static String  resolvedGatewayURL = "";

// ─── Retry queue ──────────────────────────────────────────────────────────
struct RetryEntry {
    String payload;
    uint8_t attempts;
};
static RetryEntry retryQueue[MAX_RETRY_QUEUE_SIZE];
static uint8_t retryHead = 0;
static uint8_t retryTail = 0;
static uint8_t retryCount = 0;

static unsigned long lastRetryMs = 0;
static unsigned long lastPollMs  = 0;

// ─── Forward declarations ─────────────────────────────────────────────────
static void     initWiFi();
static void     initI2C();
static void     initNFC();
static void     initScale();
static void     initMDNS();
static void     resolveGateway();
static String   readNFCTag();
static bool     objectPresent();
static void     emitEvent(const char* eventType, const String& uid);
static bool     postToGateway(const String& payload);
static void     enqueueRetry(const String& payload);
static void     flushRetryQueue();
static void     handlePairingButton();

// ══════════════════════════════════════════════════════════════════════════
//  setup()
// ══════════════════════════════════════════════════════════════════════════
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("[AURA] Booting…");

    // Pairing button (active-low with internal pull-up)
    pinMode(PAIRING_BUTTON_PIN, INPUT_PULLUP);

    // Hardware watchdog – resets the MCU if the loop stalls
    esp_task_wdt_config_t wdt_cfg = {
        .timeout_ms     = WDT_TIMEOUT_S * 1000,
        .idle_core_mask = (1 << 0),   // watch CPU0
        .trigger_panic  = true
    };
    esp_task_wdt_reconfigure(&wdt_cfg);
    esp_task_wdt_add(NULL);           // subscribe this task

    initI2C();
    initNFC();
    initScale();
    initWiFi();
    initMDNS();
    resolveGateway();

    Serial.println("[AURA] Ready.");
}

// ══════════════════════════════════════════════════════════════════════════
//  loop()
// ══════════════════════════════════════════════════════════════════════════
void loop() {
    esp_task_wdt_reset();   // pet the watchdog

    unsigned long now = millis();

    // ── Pairing button ────────────────────────────────────────────────────
    handlePairingButton();

    // ── Poll every POLL_INTERVAL_MS ───────────────────────────────────────
    if (now - lastPollMs >= POLL_INTERVAL_MS) {
        lastPollMs = now;

        String uid = readNFCTag();
        bool   weightOk = objectPresent();

        bool newTagDetected = (uid.length() > 0) && weightOk;

        if (newTagDetected && !tagPresent) {
            // ── TAG_PLACED ────────────────────────────────────────────────
            tagPresent    = true;
            currentTagUID = uid;
            emitEvent("TAG_PLACED", uid);
        } else if (!newTagDetected && tagPresent) {
            // ── TAG_REMOVED ───────────────────────────────────────────────
            tagPresent = false;
            emitEvent("TAG_REMOVED", currentTagUID);
            currentTagUID = "";
        }
    }

    // ── Retry failed HTTP POSTs ───────────────────────────────────────────
    if (retryCount > 0 && (now - lastRetryMs >= RETRY_INTERVAL_MS)) {
        lastRetryMs = now;
        flushRetryQueue();
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  Initialisation helpers
// ══════════════════════════════════════════════════════════════════════════

static void initI2C() {
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    Serial.printf("[I2C] Initialized on SDA=%d SCL=%d\n", I2C_SDA_PIN, I2C_SCL_PIN);
}

static void initNFC() {
    nfc.begin();
    uint32_t versionData = nfc.getFirmwareVersion();
    if (!versionData) {
        Serial.println("[NFC] PN532 not found – halting");
        while (true) { delay(1000); }
    }
    Serial.printf("[NFC] PN532 firmware v%d.%d\n",
        (versionData >> 16) & 0xFF,
        (versionData >> 8)  & 0xFF);
    nfc.SAMConfig();   // configure for ISO14443A tags
}

static void initScale() {
    scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
    if (scale.wait_ready_timeout(2000)) {
        scale.set_scale();   // apply calibration factor (use 1.0 until calibrated)
        scale.tare();        // zero the scale with empty platform
        Serial.println("[HX711] Scale ready.");
    } else {
        Serial.println("[HX711] Scale not responding – weight detection disabled.");
    }
}

static void initWiFi() {
    Serial.printf("[WiFi] Connecting to %s…\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print('.');
        attempts++;
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("[WiFi] Could not connect – operating in offline retry mode.");
    }
}

static void initMDNS() {
    if (!MDNS.begin(DEFAULT_DEVICE_ID)) {
        Serial.println("[mDNS] Failed to start responder.");
        return;
    }
    // Advertise this puck so the gateway can discover it
    MDNS.addService("_aura-puck", "_tcp", 80);
    Serial.printf("[mDNS] Advertising as %s._aura-puck._tcp\n", DEFAULT_DEVICE_ID);
}

/**
 * Attempt to resolve the gateway address via mDNS.
 * Falls back to GATEWAY_FALLBACK_HOST if resolution fails.
 */
static void resolveGateway() {
    IPAddress addr;
    int port = GATEWAY_FALLBACK_PORT;

    int n = MDNS.queryService(MDNS_SERVICE_NAME, MDNS_SERVICE_TYPE);
    if (n > 0) {
        addr = MDNS.IP(0);
        port = MDNS.port(0);
        Serial.printf("[mDNS] Gateway found via mDNS: %s:%d\n",
            addr.toString().c_str(), port);
    } else {
        Serial.printf("[mDNS] Gateway not found; using fallback %s:%d\n",
            GATEWAY_FALLBACK_HOST, GATEWAY_FALLBACK_PORT);
        addr.fromString(GATEWAY_FALLBACK_HOST);
    }

    resolvedGatewayURL = "http://" + addr.toString() + ":" + String(port) + GATEWAY_ENDPOINT;
    Serial.printf("[Gateway] URL: %s\n", resolvedGatewayURL.c_str());
}

// ══════════════════════════════════════════════════════════════════════════
//  Sensor helpers
// ══════════════════════════════════════════════════════════════════════════

/**
 * Attempt a non-blocking passive scan for one ISO14443A tag.
 * Returns the UID as a hex string, or "" if no tag found.
 */
static String readNFCTag() {
    uint8_t uid[7] = {0};
    uint8_t uidLength = 0;

    bool found = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50 /*ms timeout*/);
    if (!found || uidLength == 0) return "";

    String result = "";
    for (uint8_t i = 0; i < uidLength; i++) {
        if (uid[i] < 0x10) result += '0';
        result += String(uid[i], HEX);
    }
    result.toUpperCase();
    return result;
}

/**
 * Returns true when scale reads more than WEIGHT_THRESHOLD_GRAMS.
 * Handles a not-ready scale gracefully.
 */
static bool objectPresent() {
    if (!scale.is_ready()) return false;
    float grams = scale.get_units(1);
    return grams >= WEIGHT_THRESHOLD_GRAMS;
}

// ══════════════════════════════════════════════════════════════════════════
//  Event emission
// ══════════════════════════════════════════════════════════════════════════

static void emitEvent(const char* eventType, const String& uid) {
    Serial.printf("[Event] %s uid=%s\n", eventType, uid.c_str());

    JsonDocument doc;
    doc["event"]     = eventType;
    doc["uid"]       = uid;
    doc["deviceId"]  = DEFAULT_DEVICE_ID;
    doc["timestamp"] = millis();

    String payload;
    serializeJson(doc, payload);

    if (!postToGateway(payload)) {
        enqueueRetry(payload);
    }
}

static bool postToGateway(const String& payload) {
    if (WiFi.status() != WL_CONNECTED) return false;
    if (resolvedGatewayURL.isEmpty())   return false;

    HTTPClient http;
    http.begin(resolvedGatewayURL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    http.end();

    if (code >= 200 && code < 300) {
        Serial.printf("[HTTP] POST OK (%d)\n", code);
        return true;
    }
    Serial.printf("[HTTP] POST failed: %d\n", code);
    return false;
}

// ══════════════════════════════════════════════════════════════════════════
//  Retry queue
// ══════════════════════════════════════════════════════════════════════════

static void enqueueRetry(const String& payload) {
    if (retryCount >= MAX_RETRY_QUEUE_SIZE) {
        Serial.println("[Retry] Queue full – dropping oldest entry.");
        retryHead = (retryHead + 1) % MAX_RETRY_QUEUE_SIZE;
        retryCount--;
    }
    retryQueue[retryTail] = {payload, 0};
    retryTail = (retryTail + 1) % MAX_RETRY_QUEUE_SIZE;
    retryCount++;
    Serial.printf("[Retry] Enqueued (queue size: %d)\n", retryCount);
}

static void flushRetryQueue() {
    uint8_t toProcess = retryCount;   // snapshot
    for (uint8_t i = 0; i < toProcess; i++) {
        RetryEntry& entry = retryQueue[retryHead];
        if (postToGateway(entry.payload)) {
            retryHead = (retryHead + 1) % MAX_RETRY_QUEUE_SIZE;
            retryCount--;
            Serial.println("[Retry] Sent queued event.");
        } else {
            entry.attempts++;
            // Move to back of queue
            retryQueue[retryTail] = entry;
            retryTail = (retryTail + 1) % MAX_RETRY_QUEUE_SIZE;
            retryHead = (retryHead + 1) % MAX_RETRY_QUEUE_SIZE;
            // retryCount stays the same
        }
        esp_task_wdt_reset();  // don't starve the watchdog during flush
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  Pairing button
// ══════════════════════════════════════════════════════════════════════════

static void handlePairingButton() {
    static unsigned long buttonPressStart = 0;
    static bool          buttonWasPressed = false;

    bool pressed = (digitalRead(PAIRING_BUTTON_PIN) == LOW);

    if (pressed && !buttonWasPressed) {
        buttonPressStart = millis();
        buttonWasPressed = true;
    } else if (!pressed && buttonWasPressed) {
        unsigned long held = millis() - buttonPressStart;
        if (held >= 3000) {
            Serial.println("[Pair] Pairing mode activated – broadcasting token request.");
            // In production: broadcast a pairing token via mDNS TXT record
            // or open a temporary HTTP endpoint on port 80.
        }
        buttonWasPressed = false;
    }
}
