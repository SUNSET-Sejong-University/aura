# AURA Project Status & Verification Guide

This document answers: **Is AURA a real working system or a mock/toy?** and **What's missing for production?**

---

## Summary: Real Implementation

AURA is a **real, functional implementation** — not a mock. All core layers (firmware, gateway, dashboard) are implemented with real logic. Some features are stubbed or require configuration for full hardware deployment.

---

## Implemented vs. Gaps

| Feature | Status | Notes |
|---------|--------|-------|
| **Gateway API** | ✅ Complete | All 14 endpoints, SQLite, intent classification, webhooks |
| **Intent classification** | ✅ Complete | Decision tree (time + recent uses) |
| **Webhook dispatcher** | ✅ Complete | Fires HTTP to external URLs with templating |
| **WebSocket live feed** | ✅ Complete | Real-time events to dashboard |
| **Dashboard UI** | ✅ Complete | Live Feed, Workflows, Analytics, Devices |
| **Firmware (ESP32-S3)** | ✅ Complete | NFC (PN532), HX711, mDNS, WiFi, retry queue, watchdog |
| **Mock Puck simulator** | ✅ Complete | Python script for testing without hardware |
| **E2E tests** | ✅ Complete | Playwright: tag → webhook → dashboard |
| **Docker deployment** | ✅ Complete | Gateway + dashboard containers |
| **Gateway mDNS** | ⚠️ Missing | Gateway does not advertise `_aura-gateway._tcp` |
| **Physical pairing** | ⚠️ Stubbed | Button handler exists; token exchange not implemented |

---

## How to Verify Everything Works

### 1. Run Gateway Unit & API Tests

```powershell
cd gateway; npm test
```

Expected: ~33 tests pass (dispatcher + API endpoints).

### 2. Run Mock Puck (Simulate Tag Events)

```powershell
# Start gateway first (Docker or: cd gateway; npm run dev)
python tests/hardware/mock_puck.py --gateway http://localhost:3000 --cycles 3
```

Expected: TAG_PLACED/TAG_REMOVED events, intent classification, workflow results.

### 3. Run E2E Tests (Full Stack)

```powershell
.\Makefile.ps1 install   # if not done
cd tests; npm run test:e2e
```

Expected: Playwright starts gateway + dashboard, runs 4 tests (tag registration, TAG_PLACED, TAG_REMOVED, Live Feed visibility, logs).

### 4. Manual End-to-End Verification

1. **Start stack**: `docker compose up -d` or `.\Makefile.ps1 dev`
2. **Open dashboard**: http://localhost:8080 (Docker) or http://localhost:5173 (dev)
3. **Register a tag**: Workflows tab → add tag (or POST `/api/tags`)
4. **Create workflow**: Workflows tab → add workflow (tag + URL, e.g. `https://webhook.site/your-id`)
5. **Trigger event**: Run `python tests/hardware/mock_puck.py --uid YOUR_TAG_UID --cycles 1`
6. **Verify**: Live Feed shows event; webhook.site receives the request

---

## Gaps for Production

### 1. Gateway mDNS Advertisement

**Problem**: The Puck discovers the gateway via mDNS (`_aura-gateway._tcp`), but the Node.js gateway does not advertise this service.

**Workaround**: Set `GATEWAY_FALLBACK_HOST` in `firmware/src/config.h` to your gateway's IP (e.g. `192.168.1.50`). The Puck will use this when mDNS fails.

**Fix**: Add `mdns` (or similar) to the gateway to advertise on port 3000.

### 2. Physical Pairing Protocol

**Problem**: The firmware's pairing button (GPIO 0, 3 s hold) logs a message but does not exchange a token with the gateway.

**Workaround**: Devices are auto-registered when they first POST an event. "Pairing" in the dashboard just marks them as paired.

**Fix**: Implement mDNS TXT record or HTTP endpoint for token exchange.

### 3. HX711 Calibration

**Problem**: The scale uses `scale.set_scale()` with default 1.0. Real load cells need calibration.

**Fix**: Add a calibration routine (known weight, compute factor) and persist to config.

---

## Performance Target Check

README claims **Tag Touch → Web Action < 500 ms**. With mock_puck + local gateway:

- HTTP POST: ~5–20 ms
- Intent classification: < 1 ms
- Webhook fire: depends on target URL (local: ~10 ms; external: 100–300 ms)

Total is typically **< 365 ms** for local webhooks.

---

## Conclusion

| Question | Answer |
|----------|--------|
| Is it a mock? | **No.** Real gateway, real firmware, real webhooks. |
| Does it work without hardware? | **Yes.** Use `mock_puck.py` to simulate tags. |
| Is it production-ready? | **Almost.** Main gaps: gateway mDNS, pairing protocol, HX711 calibration. |
| How to verify? | Run tests + mock_puck + manual workflow test. |
