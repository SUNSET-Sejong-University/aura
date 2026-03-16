#pragma once

// ─────────────────────────────────────────
//  AURA Puck – compile-time configuration
// ─────────────────────────────────────────

// Wi-Fi credentials – override via build_flags or create firmware/src/secrets.h
// (secrets.h is gitignored – never commit real credentials)
#if __has_include("secrets.h")
#  include "secrets.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "YourSSID"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YourPassword"
#endif

// mDNS gateway service name
#define MDNS_SERVICE_NAME "_aura-gateway"
#define MDNS_SERVICE_TYPE "_tcp"
#define MDNS_GATEWAY_HOSTNAME "aura-gateway.local"

// Default gateway fallback (used if mDNS resolution fails)
#define GATEWAY_FALLBACK_HOST "192.168.1.100"
#define GATEWAY_FALLBACK_PORT 3000

// API endpoint path
#define GATEWAY_ENDPOINT "/api/events"

// Hardware – I2C pins (ESP32-S3 default)
#define I2C_SDA_PIN  8
#define I2C_SCL_PIN  9

// PN532 NFC (I2C mode, IRQ and RESET optional)
#define PN532_IRQ_PIN   10
#define PN532_RESET_PIN 11

// HX711 Load Cell
#define HX711_DOUT_PIN 12
#define HX711_SCK_PIN  13

// Weight threshold in grams: anything above = object present
#define WEIGHT_THRESHOLD_GRAMS 20.0f

// Polling interval in milliseconds
#define POLL_INTERVAL_MS 200

// HTTP retry settings
#define MAX_RETRY_QUEUE_SIZE 20
#define RETRY_INTERVAL_MS    5000

// Pairing button (active-low)
#define PAIRING_BUTTON_PIN 0   // Boot/GPIO0 as pairing button

// Watchdog timeout in seconds
#define WDT_TIMEOUT_S 30

// Device identity (overridden at pair time)
#define DEFAULT_DEVICE_ID "puck-00000000"
