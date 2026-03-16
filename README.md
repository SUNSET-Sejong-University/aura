# AURA – Augmented Real-Action

> A local-first, AI-enhanced hardware/web bridge that triggers digital workflows via physical object interaction.

Place an NFC-tagged object on the Puck → the gateway classifies your intent → webhooks fire in < 500 ms. No cloud. No tracking. All data stays on your local network.

---

## Architecture

```
[ESP32-S3 Puck]  ──HTTP──▶  [Node.js Gateway]  ──WS──▶  [React Dashboard]
  PN532 NFC                    Express + SQLite              Tailwind/Vite
  HX711 Load Cell              Context-Aware AI
  mDNS Responder               Webhook Dispatcher
```

| Layer      | Technology               | Directory    |
|------------|--------------------------|--------------|
| Firmware   | C++/Arduino (ESP32-S3)   | `/firmware`  |
| Gateway    | Node.js + Express + SQLite | `/gateway` |
| Dashboard  | React + Tailwind + Vite  | `/dashboard` |
| Schemas    | JSON Schema              | `/shared`    |
| Tests      | Vitest + Playwright      | `/tests`     |

---

## Quick Start (Docker – recommended)

```bash
# 1. Clone the repository
git clone https://github.com/SUNSET-Sejong-University/aura.git
cd aura

# 2. Build and start all containers (gateway + dashboard)
make docker
# or: docker compose up --build -d

# 3. Open the dashboard
open http://localhost:8080

# 4. Gateway API is available at
curl http://localhost:3000/health
```

---

## Local Development

### Prerequisites
- **Node.js >= 22.5** (ships `node:sqlite` as a built-in)
- **Python >= 3.9** (for the hardware simulator)
- **PlatformIO CLI** (for firmware flashing)
- **Docker + Docker Compose** (for containerised deployment)

### Install dependencies

```bash
make install
```

### Start dev servers

```bash
make dev          # starts gateway (port 3000) + dashboard (port 5173) in parallel
```

Or separately:

```bash
make dev-gateway   # http://localhost:3000
make dev-dashboard # http://localhost:5173
```

---

## Flashing the ESP32-S3

### 1. Configure Wi-Fi credentials

Edit `firmware/src/config.h` or pass via build flags:

```ini
# firmware/platformio.ini  (override section)
[env:esp32-s3-devkitc-1]
build_flags =
    -DWIFI_SSID=\"YourNetwork\"
    -DWIFI_PASSWORD=\"YourPassword\"
```

### 2. Wire the peripherals

| Module  | ESP32-S3 Pin | Description        |
|---------|--------------|--------------------|
| PN532   | SDA → GPIO 8 | NFC reader (I2C)   |
| PN532   | SCL → GPIO 9 |                    |
| HX711   | DOUT → GPIO 12 | Load cell       |
| HX711   | SCK → GPIO 13 |                   |
| Button  | GPIO 0       | Pairing button     |

### 3. Flash

```bash
make flash
# or: cd firmware && pio run --target upload
```

The Puck will:
1. Connect to Wi-Fi.
2. Advertise itself as `puck-XXXXXXXX._aura-puck._tcp` via mDNS.
3. Discover the gateway via mDNS (`_aura-gateway._tcp`).
4. Poll for tags every 200 ms and POST events to `/api/events`.

---

## Running Tests

### Gateway unit & API tests (Vitest)

```bash
make test-gateway
# or: cd gateway && npm test
```

All 33 tests should pass in < 1 s.

### Hardware simulator

```bash
make test-mock-puck
# Sends 3 TAG_PLACED/TAG_REMOVED cycles to http://localhost:3000

# Or custom:
python3 tests/hardware/mock_puck.py --gateway http://localhost:3000 --uid DEADBEEF --cycles 5
```

### E2E tests (Playwright)

```bash
make test-e2e
# Starts gateway + dashboard, then runs browser-based tests
```

---

## Gateway API Reference

All endpoints are under `http://localhost:3000`.

| Method | Path                          | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/health`                     | Server health check                |
| POST   | `/api/events`                 | Receive a TAG event from a Puck    |
| GET    | `/api/tags`                   | List all registered tags           |
| POST   | `/api/tags`                   | Register a new tag                 |
| PATCH  | `/api/tags/:uid`              | Update a tag label/description     |
| DELETE | `/api/tags/:uid`              | Delete a tag                       |
| GET    | `/api/workflows`              | List all workflows                 |
| POST   | `/api/workflows`              | Create a workflow (webhook)        |
| PATCH  | `/api/workflows/:id`          | Update a workflow                  |
| DELETE | `/api/workflows/:id`          | Delete a workflow                  |
| GET    | `/api/devices`                | List discovered Pucks              |
| PATCH  | `/api/devices/:id`            | Rename/pair a device               |
| GET    | `/api/logs`                   | Audit trail                        |
| GET    | `/api/logs/analytics/heatmap` | Hourly usage heatmap data          |

### POST /api/events

```json
{
  "event":     "TAG_PLACED",
  "uid":       "AABBCCDD",
  "deviceId":  "puck-00000001",
  "timestamp": 1700000000000
}
```

Response:

```json
{
  "ok":       true,
  "intent":   "Productive",
  "workflows": [
    { "workflowId": 1, "status": "ok", "code": 200 }
  ]
}
```

### WebSocket – `/ws`

Connect with any WS client to receive live events:

```json
{ "type": "TAG_EVENT", "event": "TAG_PLACED", "uid": "AABBCCDD", "intent": "Productive" }
```

---

## Intent Classification

The gateway uses a **lightweight decision tree** to classify each tag interaction:

| Time of day | Recent uses (1 h) | Intent       |
|-------------|-------------------|--------------|
| 08:00–18:00 | < 3               | **Productive** |
| 08:00–18:00 | ≥ 3               | **Neutral**  |
| Outside working hours | any     | **Relaxed**  |

---

## Security

- **Zero-knowledge**: All data stays on the local network. No external auth.
- **Physical pairing**: Hold the GPIO 0 button for 3 s to enter pairing mode.
- **Watchdog timer**: 30-second hardware watchdog resets the Puck if the loop stalls.

---

## Performance Target

**Tag Touch → Web Action < 500 ms**

| Stage                         | Budget  |
|-------------------------------|---------|
| NFC scan (50 ms timeout)      | ≤ 50 ms |
| HTTP POST (LAN)               | ≤ 10 ms |
| Intent classification         | < 1 ms  |
| Webhook fire (parallel)       | ≤ 300 ms|
| **Total**                     | **< 365 ms** |
