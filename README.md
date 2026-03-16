# Aura

**Aura** bridges the gap between your physical desk/home and your web-based tools like **Slack, Spotify, Home Assistant, and Notion** through a **Physical-First** philosophy.

## Core Concept

Aura is built around small, aesthetically pleasing hardware nodes called **Pucks**. These devices are equipped with:

- **NFC sensors**
- **Weight sensors**

When you place an everyday object on a Puck — such as:

- your **coffee mug**
- your **glasses**
- your **phone**
- your **work ID**

the system’s **Local AI** analyzes the surrounding context, including:

- **Who** is interacting with it
- **What time** it is
- **What’s on the user’s calendar**
- **What state** the environment is currently in

It then sends a command through a **web-based Hub** to trigger a predefined **Scene**.

---

## Example Use Case

### Morning Routine
Placing your **Work ID** on an Aura Puck at **8:00 AM** could automatically:

- Open your **Morning Dashboard** on your PC
- Start your **Focus playlist**
- Put your phone into **Do Not Disturb** mode

### End-of-Day Routine
Removing the ID at **5:00 PM** could automatically:

- Send a **“Heading home!”** message to your family
- Turn off your **office lights**

---

## Why It’s Creative and Novel

Most tech products try to push:

- more **screens** into our lives, or
- more **microphones** into our rooms

Aura takes the opposite approach: **Invisible Tech**.

Instead of adding another interface, it turns the objects you already use into the **remote controls for your digital life**.

### What makes it unique
- It uses **human habits** as the trigger
- It removes the need for a traditional **UI**
- It avoids dependence on **voice commands**
- It makes automation feel **natural**, not forced

---

## Why It’s Business-Attractive

### 1. Anti-Subscription Fatigue
Aura can be positioned as a:

> **“Buy Once, Own Forever”** hardware product

That is a strong consumer advantage in a market full of endless subscriptions.

### 2. “Lego” Ecosystem Expansion
The business model supports a modular ecosystem:

- Sell the base **Hub**
- Upsell additional **Pucks**
- Offer optional **Tags** for different rooms and use cases

This creates strong **lifetime value (LTV)** per customer.

### 3. B2B Opportunity
Aura also has serious workplace potential.

#### Office applications:
- Focus management
- Work-from-home boundary setting
- Ambient productivity tools
- Automation without invasive employee surveillance

This gives businesses a productivity tool that doesn’t feel like **“Big Brother” tracking**.

### 4. Open-Source Growth Engine
By open-sourcing the **Recipe Gallery**, the community can build integrations for niche or long-tail tools such as:

- Jira
- Trello
- Discord
- other specialized web apps

This reduces internal development burden and accelerates ecosystem growth.

---

## Technical Feasibility

Aura is realistic from both a hardware and software perspective.

### Hardware
Potential core components include:

- **ESP32-S3**  
  - low-cost
  - supports edge AI workloads

- **PN532**
  - reliable NFC support

### Estimated BOM
- **Total bill of materials (BOM): under $15**

### Software
A **Progressive Web App (PWA)** can serve as the central control layer, allowing users to configure automations such as:

> **If Physical Object X touches Puck Y, then perform Web Action Z**

This can be presented through a simple drag-and-drop workflow builder.

### AI Layer
A lightweight local model such as:

- **Random Forest**, or
- **Decision Tree**

can help reduce false triggers, such as:

- accidental placement
- environmental noise
- a cat jumping onto the desk

Because the AI runs **locally**, it also improves:

- privacy
- responsiveness
- trust

---

## Summary

Aura is a compelling **physical-to-digital automation platform** that transforms everyday objects into intuitive triggers for web and home actions.

It stands out because it is:

- **screenless**
- **habit-driven**
- **privacy-conscious**
- **modular**
- **commercially scalable**

In a market crowded with apps, dashboards, and voice assistants, Aura offers something sharper:

> **Technology that disappears into behavior.**
