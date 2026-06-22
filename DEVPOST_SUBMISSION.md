# USAII Global AI Hackathon 2026 — DEVPOST Submission

**Project:** Wayfinder AI — Voice-First Accessible Flight Booking

---

## 1. What is your project name?

**Wayfinder AI**

---

## 2. What languages, frameworks, platforms, cloud services, databases, APIs, or other technologies did you use?

Python, TypeScript, JavaScript, HTML/CSS, FastAPI, React, Vite, Motion, Cloudflare Tunnel, OpenRouter, SQLite, Duffel API, OpenAI Whisper, DeepSeek V4 Flash, OpenAI TTS, Linux, Uvicorn, Git, GitHub, pip/venv, Hermes Agent

---

## 3. Provide a link to your project's GitHub repository:

https://github.com/krai753/Wayfinder-AI

---

## 4. Provide a link where the judges can test your project:

Live demo URL (Cloudflare tunnel — ask the team for current URL or launch locally using README instructions)

**Backup:** Run locally with `cd backend && uvicorn app:app --host 0.0.0.0 --port 8000`

---

## 5. Tell us about your project and how it was built

### Project Summary

Wayfinder AI is a **voice-first travel assistant** that lets **blind and visually impaired users** book flights using only their voice. 285M+ visually impaired people worldwide cannot use standard flight booking UIs — screen readers struggle with dynamic interfaces, CAPTCHAs, dropdowns, and multi-step forms. Blind users currently must rely on sighted helpers, sharing passport data, payment info, and travel preferences with a third party.

Wayfinder AI solves this with a **conversational AI assistant** that listens, understands, confirms, and books flights — all by voice. The user never needs to read a screen or share sensitive data with a sighted helper.

### Key Innovations

**1. Voice-First Architecture**
Every interaction starts and ends with voice. The greeting, flight search results, booking confirmation, and error messages are all spoken aloud via TTS (OpenAI TTS with gTTS fallback). The screen is purely a secondary reference — the primary interface is audio.

**2. 85% Confidence Gate (Safety-First)**
Every voice command is scored by the LLM parser (DeepSeek V4 Flash). If confidence is below 85%, the system immediately escalates to a human agent — no retries, no second chances. A cumulative 3-retry threshold catches degraded conditions like ambient noise. Emergency override keywords ("emergency", "stranded", "missed my connection") bypass both layers with priority escalation.

**3. Human-in-the-Loop Handoff**
When AI cannot help (low confidence, complex itinerary, emergency), a full context chain is passed to a human CS agent via a ticket system. The agent can send messages (→ TTS to user), initiate voice calls, and book flights using plain city names.

**4. Hold-to-Confirm Payment**
Payment authorization requires a 1.5-second hold gesture with a progress ring — not a single tap. This prevents accidental voice-triggered bookings. The button shows the exact amount (e.g., "$352.67 · Hold 1.5s to pay").

### How It Was Built

**Backend:** Python FastAPI with modular routers for voice commands, booking wizard, flight search, trip management, and CS agent dashboard. DeepSeek V4 Flash via OpenRouter handles all natural language parsing. Duffel API handles flight search and booking. SQLite stores sessions, tickets, and bookings.

**Frontend:** React 19 + TypeScript + Vite with Motion animations. Web Speech API handles browser-native speech-to-text. OpenAI TTS generates spoken responses. A massive microphone button fills the mobile screen. The hold-to-confirm gesture uses a custom progress ring component.

**Safety:** The LLM parser returns a structured confidence score with every utterance. Airport codes are validated against a database. Dates are checked as real calendar dates. Passport data stays on-device. No audio leaves the device for primary STT. All 8+ architectural tradeoffs are documented in `docs/architectural-tradeoffs.md`.

---

## 6. Did you build your project for a specific track? If so, explain how it addresses that track's themes.

**Track:** Undergraduate — "AI for Life, Learning & Work"

**AI for Life:** Wayfinder AI directly improves daily living for blind and visually impaired travelers by giving them **independence in flight booking** — a task they currently cannot do without help. The voice-first interface removes the need for sighted assistance, letting users book flights privately and securely.

**AI for Learning:** The conversational interface teaches users how to navigate flight booking through natural interaction. The AI guides users step by step, asking for missing information like a patient travel agent. Users learn the flight booking workflow through spoken interaction.

**AI for Work:** By enabling independent travel booking, Wayfinder AI empowers blind/VI users to participate in business travel, conferences, and work-related trips without relying on colleagues or family members.

---

## 7. Did you build your project for a specific theme, demographic, or pressing problem? Please explain.

**Demographic:** Blind and visually impaired travelers (285M+ worldwide)

**Pressing Problem:** 
- Standard flight booking UIs are **impossible for blind users** — dynamic dropdowns, CAPTCHAs, visual seat maps, and multi-step forms are inaccessible to screen readers
- Current workaround = **ask a sighted person for help**, sharing passport data, payment info, and travel preferences
- This means blind users **cannot book flights independently or privately**
- Even "accessible" travel sites fail on complex workflows like flight changes, cancellations, or multi-city bookings

**Our Solution:**
- Pure voice interface — no screen reading required
- All data stays local (STT via Web Speech API, no server-side audio processing)
- Confidence gate prevents AI from acting on misunderstood speech
- Human escalation for any task the AI cannot handle safely
- Long-press payment prevents accidental voice-triggered bookings

---

## 8. Describe your project's responsible AI approach

**Privacy-First Design:**
- Primary speech-to-text uses the **Web Speech API** (browser-native) — no audio ever leaves the device
- OpenAI Whisper is only used as a fallback in noisy environments
- No passport data, credit card numbers, or personal documents stored on our servers
- Session-based design — no account creation required

**Safety Gates (Preventing Harm):**
- **Layer 1 — 85% Confidence Gate:** Every utterance scored 0.00–1.00 by LLM. Below 0.85 → immediate escalation to human. No booking is ever made on uncertain data.
- **Layer 2 — Cumulative Retry:** 3 consecutive low-confidence utterances in a session → escalate to human (catches ambient noise, degraded conditions).
- **Emergency Override:** "emergency", "stranded", "missed my connection" keywords bypass both gates with priority escalation.
- **Financial Safety:** Payment requires 1.5-second hold gesture (not a single tap). Prevents accidental voice-triggered payments.

**Human Oversight:**
- Every escalation creates a CS ticket with full context (last 5 utterances, confidence scores, booking state)
- Agent can override AI decisions, handle complex cases, and interact via chat or voice call
- User always has an escape path: say "talk to a human" or "help"

**Transparency:**
- Confidence scores explained to users via TTS in plain language
- Ticket IDs given for every escalation
- Error messages explain what went wrong and what to do next
- All architectural decisions and tradeoffs documented (see `docs/architectural-tradeoffs.md`)

**Inclusivity:**
- Voice-first by design — not an afterthought
- High-contrast UI with large touch targets
- Works on mobile browsers (no native app required)
- Keyboard shortcuts for demo on desktop

---

## 9. Upload your project's demo video

<!-- Upload your demo video URL here -->
<!-- https://youtube.com/your-demo-video -->

---

## 10. Upload images of your project

Screenshots in the `screenshots/` directory.
Architecture diagram at `docs/architecture.html`.

---

## 11. Additional details

**Team Size:** 1 (individual submission)

**Time to Build:** <!-- Add your timeframe -->

**Fun Fact:** The confidence gate architecture was inspired by aviation safety systems — redundant, overlapping checks with automatic escalation when any layer is uncertain. The flight-only constraint (refusing non-flight queries) was added after the AI was asked "can you tell me the weather?" on day one.

**Prize Eligibility:** Undergraduate Track — AI for Life, Learning & Work
