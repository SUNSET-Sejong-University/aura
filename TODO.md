# AURA – Implementation Roadmap

> **Objective**: Transform AURA from a working MVP into a high-potential, production-ready "Physical Macro Controller" that achieves the vision: *Zero Interface, Contextual Intelligence, Local-First, and Community-Driven Recipes.*

See **OBJECTIVES.md** for the full vision and requirements.

---

## Hardware Required for Testing & Verification

| Item | Spec / Model | Purpose |
|------|--------------|---------|
| **ESP32-S3 DevKit** | ESP32-S3-WROOM-1 or equivalent | Puck MCU; runs firmware |
| **PN532 NFC module** | I2C (SDA/SCL) | Read NFC tag UIDs |
| **HX711 load cell amp** | 5V, DOUT/SCK | Weight detection; object presence |
| **Load cell** | 1 kg or 5 kg (e.g. 50x50mm) | Physical weight sensing |
| **NFC tags** | NTAG213/215/216 or Mifare | Attach to phone, mug, ID; each has unique UID |
| **Jumper wires** | Dupont, female–female | Wire peripherals to ESP32 |
| **USB cable** | Micro-USB or USB-C (per board) | Power + flash |
| **WiFi router** | 2.4 GHz | LAN; Puck + gateway on same network |
| **Optional: enclosure** | 3D-printed or wooden puck | Aesthetic shell; not required for verification |

**Software-only testing** (no hardware): `mock_puck.py` simulates tag events. Use for gateway, dashboard, E2E.

**Minimal hardware verification**: 1× ESP32-S3 + PN532 + 1× NFC tag. HX711 optional if weight check is bypassed in firmware for dev.

---

## Master Pass Criteria (Project Complete)

The project is **fully complete and compliant** when all of the following pass:

### P0 – Production
- [ ] Gateway advertises mDNS; Puck discovers it without manual IP config
- [ ] Physical pairing flow works: hold button → dashboard → device paired
- [ ] HX711 calibrated; `objectPresent()` accurate within ±5%

### P1 – Vision
- [ ] Workflows can be conditioned by intent (Productive/Neutral/Relaxed) and/or time range
- [ ] Tags can be assigned to users; workflows can filter by user
- [ ] Recipe export/import works; ≥2 example recipes in `recipes/`

### P2 – UX
- [ ] Tags can be registered from dashboard (manual UID or "listen for tag")
- [ ] Dashboard is installable as PWA; works offline for cached view
- [ ] Scenes (multi-workflow groups) can be created and assigned to tags

### P3 – Quality
- [ ] Calendar context optional; workflow conditions can use `calendarBusy`
- [ ] P95 latency (event → response) < 500 ms for local webhook
- [ ] docs/INTEGRATIONS.md and docs/CALIBRATION.md exist
- [ ] Gateway tests ≥ 50; E2E scenarios ≥ 8; all pass

### Hardware Verification (if hardware available)
- [ ] Real Puck: place NFC-tagged object → event reaches gateway → webhooks fire
- [ ] Weight: object ≥ threshold → `objectPresent()` true; below → false
- [ ] Pairing: hold GPIO 0 for 3 s → device appears in dashboard, can be paired

---

## Success Philosophy

- **Strict criteria**: Each item has measurable pass/fail conditions. No "done" without verification.
- **Local-first**: Every feature must work without cloud. Internet is optional for webhooks only.
- **Privacy by default**: No voice, no always-on mics, no external tracking.

---

## Priority Legend

| P | Meaning | Blocking |
|---|---------|----------|
| **P0** | Production blocker – hardware/deployment fails without it | Yes |
| **P1** | Vision-critical – core differentiator from Alexa/Home | Yes |
| **P2** | High value – strong UX or differentiation | No |
| **P3** | Polish – quality, docs, community | No |

---

## P0 – Production Blockers

### P0-1: Gateway mDNS Advertisement

**Problem**: Puck discovers gateway via mDNS (`_aura-gateway._tcp`), but the Node.js gateway does not advertise. Users must manually set `GATEWAY_FALLBACK_HOST`.

**Plan**:
1. Add `mdns` (or `bonjour`) npm package to gateway.
2. On startup, advertise `_aura-gateway._tcp` on port 3000 with hostname `aura-gateway.local`.
3. Graceful fallback if mDNS fails (e.g. Docker without host network).

**Success Criteria**:
- [ ] Puck with default config (no `GATEWAY_FALLBACK_HOST` override) discovers gateway on same LAN.
- [ ] `avahi-browse -r _aura-gateway._tcp` (or equivalent) shows the service when gateway is running.
- [ ] E2E or integration test: mock puck resolves gateway via mDNS before POST (or document Docker host-mode requirement).

**Files**: `gateway/package.json`, `gateway/src/index.js`, new `gateway/src/mdns.js`

---

### P0-2: Physical Pairing Protocol

**Problem**: Pairing button (GPIO 0, 3 s hold) logs a message but does not exchange a token with the gateway. Devices are auto-registered on first POST; no secure "claim" flow.

**Plan**:
1. **Firmware**: On 3 s hold, broadcast mDNS TXT record `pairing_token=<random 6-digit>` for 60 s.
2. **Gateway**: New endpoint `GET /api/pairing` returns current pairing token (if any) and list of unpaired devices.
3. **Dashboard**: "Add Device" flow: user holds button, dashboard polls `/api/pairing`, displays token, user confirms. Gateway marks device as paired.
4. **Optional**: Gateway can reject events from unpaired devices (configurable).

**Success Criteria**:
- [ ] Hold GPIO 0 for 3 s → firmware logs pairing token.
- [ ] Gateway exposes pairing state via API.
- [ ] Dashboard can complete "pair new puck" flow without manual API calls.
- [ ] Paired device appears in Devices list with `paired: 1`.

**Files**: `firmware/src/main.cpp`, `gateway/src/routes/pairing.js`, `gateway/src/db/database.js`, `dashboard/src/components/DeviceList.tsx`

---

### P0-3: HX711 Load Cell Calibration

**Problem**: Scale uses default `set_scale(1.0)`. Real load cells need a calibration factor. No way to calibrate or persist.

**Plan**:
1. **Firmware**: Add calibration mode (e.g. double-tap pairing button within 2 s). In calibration mode:
   - Prompt via Serial: "Place known weight (g), then press button."
   - Read raw units, compute factor = known_weight / raw_units, store in NVS or `config.h` override.
2. **Config**: Add `HX711_CALIBRATION_FACTOR` to `config.h` (or NVS key) with default 1.0.
3. **Documentation**: README section on calibration procedure.

**Success Criteria**:
- [ ] With 100 g weight, calibration produces factor that yields ±5% accuracy on subsequent reads.
- [ ] Factor persists across power cycles (NVS or build flag).
- [ ] `objectPresent()` returns true for objects ≥ `WEIGHT_THRESHOLD_GRAMS` after calibration.

**Files**: `firmware/src/main.cpp`, `firmware/src/config.h`, `README.md`

---

## P1 – Vision-Critical (Contextual Intelligence)

### P1-1: Intent-Based Workflow Conditions

**Problem**: All workflows for a tag fire regardless of intent. Vision: "Same object, different behavior by context" (e.g. 9 AM = Deep Work, 9 PM = Relaxed).

**Plan**:
1. **Schema**: Add `conditions` JSON column to `workflows` table:
   ```json
   { "intent": ["Productive"], "hourMin": 8, "hourMax": 12 }
   ```
   Empty or null = no conditions (always fire).
2. **Dispatcher**: After fetching workflows, filter by conditions. Support: `intent` (array), `hourMin`/`hourMax` (optional).
3. **Dashboard**: Workflow form gets "Conditions" section: intent checkboxes, optional time range.
4. **Webhook body**: Continue passing `{{intent}}`, `{{hourOfDay}}` for downstream logic.

**Success Criteria**:
- [ ] Workflow with `conditions: { "intent": ["Productive"] }` fires only when intent is Productive.
- [ ] Workflow with `conditions: { "hourMin": 8, "hourMax": 12 }` fires only 08:00–12:00.
- [ ] Workflow with no conditions fires always (backward compatible).
- [ ] Unit test: `dispatch` returns filtered workflows for given context.
- [ ] E2E test: create conditional workflow, trigger at different times, verify correct firing.

**Files**: `gateway/src/db/database.js`, `gateway/src/ai/dispatcher.js`, `gateway/src/routes/workflows.js`, `dashboard/src/components/WorkflowBuilder.tsx`

---

### P1-2: User Identity ("Who")

**Problem**: No notion of "who" placed the object. Vision: "If your kid puts their iPad on the same puck → Homework Mode."

**Plan**:
1. **Model**: Introduce "user" as optional layer. Tag can be bound to a user, or "shared."
   - `tags` table: add `user_id TEXT` (nullable). Null = shared (current behavior).
   - New `users` table: `id`, `name`, `persona` (e.g. "adult", "child").
2. **Composite identity**: Option A – "User Tag": user wears NFC keychain. Placing keychain + object = composite (user + object). Option B – "Device Tag": tag on device implies user (iPad tag = kid). Simpler: tag is pre-bound to user in dashboard.
3. **MVP**: Tags have optional `user_id`. Workflows can filter by `user_id`. When event arrives, we use `tag.user_id` (no composite detection in MVP).
4. **Future**: Composite detection (keychain + phone) requires firmware to report multiple UIDs or sequence; defer to P3.

**Success Criteria**:
- [ ] Tags can be assigned to a user in dashboard.
- [ ] Workflows can optionally filter by `user_id` (e.g. "only for user X").
- [ ] Event from tag with `user_id` includes `userId` in webhook context.
- [ ] Unassigned tags behave as today (shared).
- [ ] Migration adds `user_id` to tags, new `users` table; backward compatible.

**Files**: `gateway/src/db/database.js`, `gateway/src/routes/tags.js`, `gateway/src/routes/users.js`, `gateway/src/ai/dispatcher.js`, `gateway/src/ai/webhooks.js`, `dashboard/src/App.tsx`, `dashboard/src/components/WorkflowBuilder.tsx`

---

### P1-3: Recipe Gallery (Export / Import)

**Problem**: No way to share or download community "recipes" (Work Modes, Sleep Modes, etc.). Vision: "Open-sourcing the Recipe Gallery allows community to build integrations."

**Plan**:
1. **Export**: Single workflow or "scene" (multiple workflows) as JSON. Schema: `{ tag_uid, label, workflows: [{ name, url, method, headers, body, conditions }] }`.
2. **Import**: API `POST /api/recipes/import` accepts JSON, creates tag (if new) and workflows. Idempotent by tag_uid or optional "replace" flag.
3. **Dashboard**: "Import Recipe" button → paste JSON or file upload. "Export" for current tag + workflow set.
4. **Gallery**: Separate repo or `/recipes` folder in this repo with JSON files. README lists them. Example: `recipes/deep-work-mode.json`, `recipes/homework-mode.json`.

**Success Criteria**:
- [ ] Export produces valid JSON that matches schema.
- [ ] Import creates tag and workflows; duplicate tag_uid is handled (update or skip).
- [ ] At least 2 example recipes in `recipes/` folder: "Deep Work" (Slack + Pomodoro + light), "Homework Mode" (router block).
- [ ] Dashboard has Import/Export UI.
- [ ] E2E test: export → import → trigger → verify webhooks fire.

**Files**: `gateway/src/routes/recipes.js`, `shared/recipe.schema.json`, `dashboard/src/components/WorkflowBuilder.tsx`, `recipes/*.json` (new)

---

## P2 – High Value (UX & Differentiation)

### P2-1: Tag Registration from Dashboard

**Problem**: Tags are auto-registered on first event or via API. No way to "register a new tag" before placing it (e.g. "tap to register" flow).

**Plan**:
1. **Dashboard**: "Register Tag" flow: user enters UID manually (from NFC tool) or "Listen for tag" (gateway holds temporary listener, next event creates tag with label).
2. **API**: `POST /api/tags` with `uid` and optional `label`. Already exists; ensure UI uses it.
3. **Optional**: Firmware "registration mode" – slow blink LED, next tag placed gets UID printed to Serial for user to copy.

**Success Criteria**:
- [ ] User can add a tag from dashboard before any event (manual UID).
- [ ] "Listen for tag" mode: gateway accepts one event, creates tag, returns UID to dashboard.
- [ ] Workflow Builder shows all tags including newly registered.

**Files**: `dashboard/src/App.tsx`, `dashboard/src/components/WorkflowBuilder.tsx`, `gateway/src/routes/events.js` (optional listen mode)

---

### P2-2: PWA / Offline Dashboard

**Problem**: Dashboard is SPA only. No service worker, no offline install. Vision: "Progressive Web App acts as the Brain."

**Plan**:
1. Add `vite-plugin-pwa` (Workbox) to dashboard.
2. Generate `manifest.json` with name, icons, short_name, start_url.
3. Cache static assets and API responses (optional, with network-first for API).
4. Ensure dashboard works offline for viewing (cached data); API calls fail gracefully with "Offline" message.

**Success Criteria**:
- [ ] `manifest.json` exists; Lighthouse PWA audit passes (installable).
- [ ] Dashboard installs as app on mobile/desktop.
- [ ] Offline: cached UI loads; API calls show "Offline" or "No connection" message.
- [ ] No regression in E2E tests.

**Files**: `dashboard/src/`, `dashboard/vite.config.ts`, `dashboard/index.html`, `dashboard/public/manifest.json`

---

### P2-3: Predefined "Scenes" in UI

**Problem**: Users create workflows one-by-one. Vision: "Scene" = multiple actions (Slack + Pomodoro + light). No first-class "Scene" concept.

**Plan**:
1. **Model**: "Scene" = named group of workflows. Same as Recipe but stored in DB.
   - `scenes` table: `id`, `name`, `description`.
   - `scene_workflows` table: `scene_id`, `workflow_id` (or inline workflow def).
2. **UI**: "Scenes" tab or section. Create scene: add multiple workflows, assign to tag + event. One-click "Apply scene" to tag.
3. **Execution**: On event, resolve scene → workflows for that tag; same as current (workflows can be linked to scene for display only, or scene expands to workflows at save time).

**Success Criteria**:
- [ ] User can create "Deep Work" scene with 3 workflows.
- [ ] Assigning scene to tag creates all workflows for that tag.
- [ ] Triggering tag fires all workflows in scene.
- [ ] Scene can be exported as Recipe (reuse P1-3).

**Files**: `gateway/src/db/database.js`, `gateway/src/routes/scenes.js`, `dashboard/src/components/Scenes.tsx`

---

## P3 – Polish & Scale

### P3-1: Calendar Context (Optional)

**Problem**: Vision mentions "What's on the user's calendar?" – not implemented.

**Plan**:
1. **Optional integration**: Google Calendar API or CalDAV. User configures OAuth or CalDAV URL in dashboard.
2. **Context**: `buildContext` fetches "current event" or "next 1h" from calendar. Add `calendarEvent`, `calendarBusy` to context.
3. **Conditions**: Workflows can filter by `calendarBusy` (e.g. "only fire when in meeting").
4. **Privacy**: All calendar data stays local; no cloud sync of calendar to AURA.

**Success Criteria**:
- [ ] With calendar configured, context includes `calendarEvent` (or null).
- [ ] Workflow condition `calendarBusy: true` fires only when calendar has event in current time.
- [ ] Without calendar config, behavior unchanged.

**Files**: `gateway/src/ai/calendar.js` (new), `gateway/src/ai/dispatcher.js`, `gateway/src/routes/settings.js`, `dashboard/src/components/Settings.tsx`

---

### P3-2: Performance Validation

**Problem**: README claims "Tag Touch → Web Action < 500 ms." Need automated validation.

**Plan**:
1. **Benchmark script**: `tests/performance/latency.js` – POST event, measure time to response. Assert < 500 ms for local webhook.
2. **CI**: Add `make test-perf` or `npm run test:perf` to run benchmark.
3. **Document**: Actual latency breakdown in README or PROJECT_STATUS.

**Success Criteria**:
- [ ] Benchmark script exists and runs.
- [ ] P95 latency (event → response) < 500 ms for local webhook.
- [ ] CI runs benchmark on PR (optional, fail if regressed).

**Files**: `tests/performance/latency.js`, `Makefile`, `README.md`

---

### P3-3: Documentation & Onboarding

**Plan**:
1. **README**: Add "Quick Start" section with 5-minute path: Docker → register tag → add workflow → mock_puck.
2. **docs/INTEGRATIONS.md**: How to connect Slack, Home Assistant, IFTTT, webhook.site (with example URLs).
3. **docs/CALIBRATION.md**: HX711 calibration steps (from P0-3).
4. **Dashboard**: "Getting Started" tooltip or first-time empty state with link to docs.

**Success Criteria**:
- [ ] New user can go from clone to first webhook in < 10 minutes.
- [ ] At least 2 integration examples (Slack, Home Assistant or IFTTT).
- [ ] Calibration doc exists and is accurate.

**Files**: `README.md`, `docs/INTEGRATIONS.md`, `docs/CALIBRATION.md`, `dashboard/src/App.tsx`

---

### P3-4: Test Coverage & Stability

**Plan**:
1. **Gateway**: Ensure all new routes (pairing, recipes, scenes, users) have Vitest tests.
2. **E2E**: Add tests for: pairing flow, import recipe, conditional workflow, user-filtered workflow.
3. **Target**: Gateway test count ≥ 50; E2E scenarios ≥ 8.

**Success Criteria**:
- [ ] `make test-gateway` passes; no skipped tests.
- [ ] `make test-e2e` passes; covers all new user flows.
- [ ] CI runs both on every PR.

**Files**: `gateway/tests/`, `tests/e2e/`

---

## Implementation Order

```
P0-1 (mDNS)     → P0-2 (Pairing)        → P0-3 (HX711)
                      ↓
P1-1 (Conditions) → P1-2 (Users)        → P1-3 (Recipes)
                      ↓
P2-1 (Tag UI)   → P2-2 (PWA)            → P2-3 (Scenes)
                      ↓
P3-1 (Calendar) → P3-2 (Perf)           → P3-3 (Docs) → P3-4 (Tests)
```

**Recommended first sprint**: P0-1, P0-2, P1-1 (mDNS + pairing + intent conditions).

---

## Definition of Done (Per Item)

- [ ] Code implemented and merged
- [ ] Success criteria met (all checkboxes)
- [ ] Tests added/updated
- [ ] README or docs updated if user-facing
- [ ] No regression in existing E2E tests

---

## References

- Vision: Physical Macro Controller, Zero Interface, Contextual Intelligence
- PROJECT_STATUS.md: Current gaps vs production
- README.md: Architecture, API, Quick Start
