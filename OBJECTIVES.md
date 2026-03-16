# AURA – Objectives, Goals & Requirements

> **AURA** = **Augmented Real-Action** — A system of AI-powered "smart surfaces" that trigger complex digital workflows through simple physical gestures.

This document captures the full vision, goals, and requirements for the AURA project. See **TODO.md** for the implementation roadmap and **PROJECT_STATUS.md** for current gaps.

---

## 1. Core Vision

### 1.1 Physical Macro Controller (Smart Surfaces)

AURA replaces cluttered apps and invasive voice assistants with a **tangible interface**. Instead of opening a web app or talking to Alexa, you **move physical objects** — place your phone on a wooden puck, and your digital life responds.

- **Smart surfaces / intelligent coasters**: Physical pucks that sit on your desk or home surface.
- **Physical gestures as triggers**: Placing, removing, or swapping objects triggers workflows.
- **No screen required**: The interface is the object itself.

### 1.2 Zero Interface

- **Eliminates screen fatigue**: No need to open apps, tap phones, or stare at dashboards.
- **No Alexa, no voice**: No always-on microphones, no voice commands.
- **Pure physical interaction**: Place object → action happens. Remove object → another action (optional).

### 1.3 Tactile Satisfaction

Humans like touching things. Physical objects provide:
- **Tangible feedback**: You feel the object, the surface, the weight.
- **Spatial memory**: "Phone goes here for work mode" becomes muscle memory.
- **Reduced cognitive load**: No menus, no settings to navigate.

---

## 2. Contextual Intelligence

### 2.1 The "Who, What, When" Model

AURA understands **context** — not just *what* object was placed, but:

| Dimension | Description | Example |
|-----------|-------------|---------|
| **Who** | Who placed the object | Kid's iPad → Homework Mode; your phone → Deep Work |
| **What** | Which object (NFC tag UID) | Phone, mug, work ID badge |
| **When** | Time of day, calendar, recent usage | 9 AM → productive; 9 PM → relaxed |
| **Environment** | Optional: calendar, room state | In meeting → DND; at home → family mode |

### 2.2 Example Scenarios

- **Work ID at 8 AM**: Place work badge on puck → Slack "Deep Work" status, Pomodoro timer starts, desk light turns red (focus).
- **Work ID at 5 PM**: Same badge, different time → Slack "Away", light off, wrap-up reminder.
- **Kid's iPad**: Child places iPad on puck → Homework Mode: router blocks games, enables study sites.
- **Phone at 9 AM**: Your phone → Productive intent → Slack + Pomodoro + red light.
- **Phone at 9 PM**: Same phone → Relaxed intent → Different workflows (e.g. dim lights, music).

### 2.3 Creative Triggers

Human habits become triggers:
- Morning coffee mug → Start daily standup reminder.
- Keys on the puck → "Leaving home" scene (lock doors, turn off lights).
- Book on the puck → Reading mode (quiet notifications).

---

## 3. Why Alexa & Smart Home Fail (AURA's Differentiators)

| Problem | Alexa / Apple Home | AURA |
|--------|-------------------|------|
| **Privacy** | Always listening; cloud processing | No voice; local-only; zero-knowledge |
| **Complexity** | Apple Home nightmare; dozens of apps | One puck, one dashboard, webhooks |
| **Rigidity** | Smart button = 1–2 fixed functions | Same object, different behavior by context |
| **Subscription** | Many require monthly fees | Buy once; no subscription |
| **Internet dependency** | Cloud-first; fails when offline | Local-first; works without internet |

---

## 4. Technical Requirements

### 4.1 Hardware Stack

| Component | Spec | Purpose |
|-----------|------|---------|
| **MCU** | ESP32-S3 | Puck brain; WiFi, mDNS, HTTP client |
| **NFC** | PN532 (I2C) | Read NFC tag UIDs; identify objects |
| **Weight** | HX711 + load cell | Object presence; reduce false triggers |
| **BOM target** | < $15 | Affordable for DIY and B2B |

### 4.2 Software Stack

- **Gateway**: Node.js + Express + SQLite; intent classification; webhook dispatcher.
- **Dashboard**: React + Tailwind + Vite; PWA for "Brain" role.
- **Intent engine**: Lightweight decision tree (time + recent uses) — no cloud AI.
- **Decision tree**: Reduces false triggers; contextual filtering.

### 4.3 Performance

- **Tag Touch → Web Action < 500 ms** (target: ~365 ms for local webhooks).
- **Local-first**: All data on LAN; internet optional for outbound webhooks only.

---

## 5. Business & Product Goals

### 5.1 Anti-Subscription, Buy Once

- No monthly fees.
- Hardware + open-source software; user owns the stack.

### 5.2 Lego Ecosystem

- **Workflow Builder**: Like Zapier — connect pucks to Slack, Home Assistant, IFTTT, custom webhooks.
- **Recipes**: Pre-built workflows (Deep Work, Homework Mode, Sleep Mode) that users can import.
- **Extensible**: Add new integrations via webhooks; no vendor lock-in.

### 5.3 Open-Source Recipe Gallery

- Community-contributed recipes (JSON export/import).
- Trust through transparency: anyone can audit what a recipe does.
- Reduces setup friction: "Import Deep Work Mode" instead of building from scratch.

### 5.4 B2B Potential

- Office productivity: desk pucks for focus modes.
- Education: classroom pucks for student devices.
- Healthcare / hospitality: context-aware room controls.

### 5.5 Market Position

- **Interstitial gap**: Too hardware-heavy for pure software teams; too smart/integrated for traditional hardware makers. AURA bridges both.
- **Tangible AI for home office**: Little direct competition in this niche.
- **High-success, low-competition**: Boring but labor-heavy niches — home management, productivity — where users have real friction.

---

## 6. Local-First & Privacy

### 6.1 Local Agency

- **Cloud-first fails** when the internet is down. AURA works fully offline for core flows.
- **Local-first, web-enhanced**: Core logic runs locally; webhooks can call external services when needed.

### 6.2 Privacy by Default

- No voice; no always-on mics.
- No external tracking; no analytics to third parties.
- All event data stays on the user's network.
- Zero-knowledge: gateway never sends event payloads to AURA servers (there are none).

### 6.3 Community-Vetted Alternative

- Open-source builds trust.
- Universal friction points: privacy, home management, productivity — areas where users want alternatives to Big Tech.

---

## 7. Invisible Tech

- The puck should feel like furniture, not gadgetry.
- No screens on the puck; no LEDs (or minimal status).
- The "magic" is in the action, not the interface.
- User thinks: "I put my phone here and things happen" — not "I'm using a device."

---

## 8. Requirements Summary

| Category | Requirement |
|----------|-------------|
| **Physical** | NFC + weight sensing; object placement as trigger |
| **Context** | Who, What, When (intent, time, optional user/calendar) |
| **Zero Interface** | No voice; no mandatory screens; physical-first |
| **Local-First** | Works offline; no cloud dependency for core logic |
| **Privacy** | No tracking; no always-on mics; data stays local |
| **Performance** | Event → webhook < 500 ms |
| **Extensibility** | Workflow Builder; webhooks; Recipe Gallery |
| **Business** | Buy once; open-source; BOM < $15 |
| **UX** | PWA dashboard; pairing flow; tag registration |

---

## 9. Success Definition

AURA is **fully complete and compliant** when:

1. **Production**: mDNS, pairing, HX711 calibration work end-to-end.
2. **Vision**: Intent conditions, user identity, Recipe Gallery are implemented.
3. **UX**: Tag registration, PWA, Scenes are available.
4. **Quality**: Docs, tests, performance validation pass.
5. **Hardware**: Real Puck can place tag → event → webhooks fire with correct context.

See **TODO.md** → "Master Pass Criteria" for the detailed checklist.
