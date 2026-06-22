# ✈️ Wayfinder AI — Voice-First Accessible Flight Booking

[![USAII Global AI Hackathon 2026](https://img.shields.io/badge/USAII-Global_AI_Hackathon_2026-4F46E5)](https://usaii-global-ai-hackathon-2026.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Wayfinder AI** is a voice-first travel assistant that lets **blind and visually impaired users** book flights using only their voice. Built for the USAII Global AI Hackathon 2026 — **Undergraduate Track: "AI for Life, Learning & Work"**.

> 🎯 **Problem:** 285M+ visually impaired people worldwide can't use standard flight booking UIs. Screen readers struggle with dynamic flight search interfaces, complex drop-downs, and CAPTCHAs. Blind users currently must rely on sighted helpers — sharing passport data, payment info, and travel preferences with a third party.
>
> ✅ **Solution:** A conversational AI assistant that listens, understands, confirms, and books — all by voice. The user never needs to read a screen or share sensitive data with a sighted helper.

---

## 📖 Table of Contents

- [Project Summary](#-project-summary)
- [Key Features](#-key-features)
- [Live Demo](#-live-demo)
- [How It Works (Flow)](#-how-it-works-flow)
- [Architecture Diagram](#-architecture-diagram)
- [Tech Stack](#-tech-stack)
- [Safety & Confidence System](#-safety--confidence-system)
- [Human-in-the-Loop Handoff](#-human-in-the-loop-handoff)
- [Accessibility Design](#-accessibility-design)
- [Responsible AI](#-responsible-ai)
- [API Endpoints](#-api-endpoints)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Built With](#-built-with)
- [Team](#-team)
- [License](#-license)

---

## 📝 Project Summary

| Field | Details |
|-------|---------|
| **Project Name** | Wayfinder AI |
| **Hackathon** | USAII Global AI Hackathon 2026 |
| **Track** | Undergraduate — AI for Life, Learning & Work |
| **Problem** | 285M+ blind/VI people cannot use standard flight booking UIs. Screen readers fail on dynamic web apps. |
| **Solution** | Voice-first AI travel assistant — speak naturally, confirm by voice, book flights hands-free. |
| **Core Innovation** | 85% LLM confidence gate with human-in-the-loop handoff prevents accidental bookings while keeping the flow fully voice-driven. |
| **Target Users** | Blind and visually impaired travelers who need independent flight booking. |

---

## 🌟 Key Features

### 🎙️ Voice-First by Design
Every interaction starts and ends with voice. The greeting, flight results, and booking confirmation are all spoken aloud via TTS. The screen is a secondary reference — the primary interface is audio.

### 🔄 Conversational Flow (Like a Real Travel Agent)
The assistant asks for missing information step by step:
- *"Book a flight from London to Tokyo tomorrow"* → Searches → *"I found 82 flights, cheapest at $482. Shall I confirm?"*
- *"Yes"* → *"What is the passenger's full name?"* → *"John Smith"* → *"Shall I confirm the booking for John Smith?"*
- *"Yes"* → Booking confirmed with reference code + TTS announcement.

### 🛡️ Safety-First Architecture
- **85% confidence gate** — any utterance parsed below 85% confidence immediately escalates to a human agent. No booking is ever made on uncertain data.
- **3-retry threshold** — ambient noise or garbled speech accumulating 3 low-confidence hits triggers escalation.
- **Emergency override** — "emergency", "missed my connection", "stranded" keywords bypass both gates and create priority tickets.
- **Long-press to confirm payment** — 1.5-second hold gesture prevents accidental voice-triggered bookings. The hold button shows the amount (e.g. *"$352.67 · Hold 1.5s to pay"*) with a progress ring filling up.

### 🤝 Human-in-the-Loop Handoff
When the AI can't help (low confidence, complex itinerary, emergency), a full context chain is passed to a human CS agent:
- Ticket created with session ID, confidence scores, last 5 utterances
- Agent can send messages → TTS reads aloud to user
- Agent can initiate a voice call directly
- Agent can book flights using plain city names (auto-resolves to IATA codes)
- User can check messages anytime by saying *"check my messages"*

### 🌐 Free-Form Natural Language
No rigid command formats. The AI understands:
- *"I need to go to London from Tokyo on June 25th"*
- *"Find me cheap flights, LHR to NRT, around the 25th, economy"*
- *"Show me what's available from New York to Paris this weekend under $500"*

### 💰 No Paid API Dependency for Core Features
| Feature | API | Cost |
|---------|-----|------|
| Speech → Text (primary) | Web Speech API (browser-native) | **Free** |
| Speech → Text (fallback) | OpenAI Whisper | Pay-as-you-go |
| Text → Speech (primary) | OpenAI TTS | Pay-as-you-go |
| Text → Speech (fallback) | gTTS | **Free** |
| Flight Search & Booking | Duffel API (sandbox mode) | **Free** |
| NLP / Intent Parsing | DeepSeek V4 Flash via OpenRouter | ~$0.15/M tokens |

---

## 🎥 Live Demo

<!-- Add your demo video URL here after recording -->
<!-- App is live at trycloudflare.com — ask the developer for the current tunnel URL -->

**Screenshots:**

![Wayfinder AI — Voice Screen](screenshots/voice-screen.png)
*The main voice interface — a single large microphone button fills the screen. Tap to start speaking.*

![Wayfinder AI — Flight Results](screenshots/results.png)
*Flight results read aloud via TTS. Screen shows price, departure/arrival times, and airline.*

![Wayfinder AI — Review & Confirm](screenshots/review.png)
*Review screen with hold-to-confirm payment — 1.5-second gesture with progress ring.*

![Wayfinder AI — CS Dashboard](screenshots/cs-dashboard.png)
*Human agent dashboard showing tickets, chat, call, and flight booking tools.*

---

## 🔄 How It Works (Flow)

```
User opens app
    │
    ▼
[💬] "Welcome to Wayfinder AI. How can I help you?" (TTS greeting)
    │
    ▼
User speaks naturally → Web Speech API captures audio
    │
    ▼
DeepSeek V4 Flash parses intent + fields + confidence score
    │
    ├── Confidence < 85%? ──→ ESCALATE to human agent immediately
    │
    ├── Confidence ≥ 85%? ──→ Proceed with extracted info
    │
    ▼
Missing info? ──→ AI asks: "What date?", "Where from?", etc.
    │
    ▼
All fields collected → Search Duffel for flights
    │
    ▼
Results spoken via TTS: "82 flights found. Cheapest at $482."
    │
    ▼
User says "Yes" → Collect passenger name
    │
    ▼
AI asks: "Shall I confirm booking?" → User says "Yes"
    │
    ▼
Hold-to-confirm payment screen (1.5s gesture)
    │
    ▼
Booking confirmed → Reference code + TTS announcement
```

The complete flow from first tap to confirmed booking takes **under 2 minutes** for experienced users.

---

## 🏗️ Architecture Diagram

> Open `docs/architecture.html` in your browser for the full interactive architecture diagram, or view it below.

![Wayfinder AI Architecture](docs/architecture-overview.png)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          👤 USER (Browser)                          │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Web       │  │  React SPA   │  │  OpenAI    │  │  🎤 Tap   │  │
│  │  Speech    │  │  TypeScript  │  │  TTS Play  │  │  to Speak │  │
│  │  API (STT) │  │  + Vite +    │  │  + gTTS    │  │  (Large   │  │
│  │            │  │  Motion      │  │  Fallback  │  │  Button)  │  │
│  └────────────┘  └──────┬───────┘  └────────────┘  └────────────┘  │
│                          │  /api proxy                              │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                    🐍 PYTHON FASTAPI (Uvicorn :8000)                 │
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Voice      │ │ LLM Parser │ │ Booking    │ │   🗄️ SQLite      │  │
│  │ Router     │ │ (DeepSeek  │ │ Router     │ │   Sessions       │  │
│  │ POST /api/ │ │  V4 Flash) │ │ Duffel     │ │   Tickets        │  │
│  │ voice/*    │ │  Intent    │ │ Client     │ │   Bookings       │  │
│  └────────────┘ │  Parsing   │ └────────────┘ └──────────────────┘  │
│                 └────────────┘                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                       │
│  │ Wizard     │ │ CS         │ │ Manage     │                       │
│  │ Router     │ │ Dashboard  │ │ Router     │                       │
│  │ Session    │ │ Tickets    │ │ My Trips   │                       │
│  │ State      │ │ Agent Call │ │ Portfolio  │                       │
│  │ Retry Trkr │ │ Manual     │ │ Budget     │                       │
│  └────────────┘ │ Booking    │ └────────────┘                       │
│                 └────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│              ☁️ EXTERNAL APIS & SERVICES                            │
│                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ OpenRouter │ │  Duffel    │ │  OpenAI    │ │  Cloudflare      │  │
│  │ DeepSeek   │ │  Flight    │ │  TTS API   │ │  Tunnel (public  │  │
│  │ V4 Flash   │ │  Search    │ │            │ │  demo URL)       │  │
│  └────────────┘ │  & Book    │ └────────────┘ └──────────────────┘  │
│                 └────────────┘                                       │
│                                                                      │
│  🛡️ SAFETY: 85% Confidence Gate · Emergency Override · 1.5s Hold   │
│  ♿ ACCESSIBILITY: Voice-Only Mode · High-Contrast · Large Targets   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

| Layer | Component | Technology | Purpose |
|-------|-----------|------------|---------|
| **Client** | Voice Input | Web Speech API / Whisper | Captures user speech |
| **Client** | SPA Frontend | React + TypeScript + Vite | Renders accessible UI |
| **Client** | Audio Output | OpenAI TTS / gTTS | Speaks responses to user |
| **Backend** | Voice Router | FastAPI | Routes voice commands, TTS, STT |
| **Backend** | LLM Parser | DeepSeek V4 Flash | Natural language → structured intent |
| **Backend** | Wizard Router | FastAPI | Manages conversation state, retries |
| **Backend** | Booking Router | FastAPI + Duffel | Flight CRUD operations |
| **Backend** | CS Dashboard | FastAPI + HTML/JS | Human agent support interface |
| **Backend** | Manage Router | FastAPI | User trip history & portfolio |
| **Backend** | Database | SQLite | Sessions, tickets, bookings |
| **External** | LLM API | OpenRouter + DeepSeek | Intent parsing |
| **External** | Flight API | Duffel Sandbox | Search & book flights |
| **External** | TTS API | OpenAI | Text-to-speech generation |
| **External** | Tunnel | Cloudflare | Public demo URL via tunnel |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Motion (animations) |
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **Database** | SQLite |
| **Speech → Text** | Web Speech API (browser-native), OpenAI Whisper (fallback) |
| **Text → Speech** | OpenAI TTS, gTTS (fallback) |
| **LLM / NLP** | DeepSeek V4 Flash via OpenRouter |
| **Flight Search** | Duffel API (sandbox mode) |
| **Infrastructure** | Cloudflare Tunnel (public demo URL) |
| **Version Control** | Git, GitHub |
| **Development Tools** | Hermes Agent (AI coding assistant) |

---

## 🛡️ Safety & Confidence System

Wayfinder uses a **two-layer confidence system** to protect users from misunderstanding, garbled speech, or ambient noise:

### Layer 1: Single-Utterance (85% Threshold)
Every utterance is scored 0.00–1.00 by the LLM. If confidence < **0.85**, escalation fires **immediately** — no retry, no second chance. The system never acts on uncertain data.

### Layer 2: Cumulative Retry (3 Strikes)
Even when individual utterances score ≥85%, the system tracks cumulative low-confidence events (<0.80). After 3 in a session, the system escalates to a human — this catches degraded conditions like ambient noise or connection issues.

### Emergency Override
Keywords like "emergency", "missed my connection", or "stranded" bypass both layers and create a priority CS ticket.

### Financial Safety
Payment authorization requires a **1.5-second hold gesture** (not a single tap). This prevents accidental voice-triggered bookings. The button displays the exact amount and a progress ring fills as the user holds.

**No booking is ever made on sub-85% confidence data.**

---

## 🤝 Human-in-the-Loop Handoff

When the AI escalates, it creates a CS ticket with full context:

1. **Ticket Creation** — Unique ticket ID (TKTXXXXXXXX), session snapshot, confidence scores, last 5 utterances
2. **User Notification** — TTS announces the ticket ID and instructions
3. **Agent Dashboard** — Agent sees ticket in sidebar with full context
4. **Agent Actions** — Send chat messages (→ TTS to user), initiate voice call, search/book flights
5. **Resolution** — Agent marks ticket resolved, user returns to AI flow

**The human agent can handle** multi-city itineraries, special assistance, unaccompanied minors, group bookings, travel insurance, visa/immigration questions, and error resolution — all capabilities the AI cannot do.

---

## ♿ Accessibility Design

| Feature | Implementation |
|---------|---------------|
| **Voice-only mode** | Every action can be completed without touching the screen |
| **Large mic button** | 100px+ hit target, fills the screen on mobile |
| **High contrast** | Dark background, bright text, clear visual hierarchy |
| **Hold-to-confirm** | 1.5s gesture prevents accidental bookings, progress ring feedback |
| **Fallback to text** | Text input available when voice fails or environment is noisy |
| **Emergency keywords** | "Help me", "emergency", "stranded" → immediate human agent |
| **Keyboard shortcut** | Hold `+` key simulates volume-button payment confirmation |
| **TTS for everything** | Results, errors, booking confirmations all spoken aloud |

---

## 🤖 Responsible AI Design

### Mitigating Failure Modes

| Risk | Mitigation |
|------|-----------|
| Speech misrecognizes a city | AI reads back full route for confirmation before booking |
| Wrong date is parsed | Resolved date is spoken aloud; user confirms |
| Background noise garbles input | 85% confidence gate catches it → escalate to human |
| LLM hallucinates a flight | Airport codes validated against database; dates checked as real |
| User speaks non-flight command | Polite "I can only help with flight bookings" response |
| Ambient noise over multiple turns | 3-retry threshold escalates before wrong booking |

### Ethical Principles

- **Privacy** — No audio leaves the device for primary STT (Web Speech API). Passenger data stays local. No passport or credit card data stored on our servers.
- **Human Oversight** — Every booking requires explicit voice confirmation + hold-to-pay gesture. Low-confidence utterances escalate to a human.
- **Inclusivity** — Built for blind and visually impaired users. Voice-first by design, not as an afterthought.
- **Transparency** — Confidence scores, ticket IDs, and escalation reasons are all explained to the user via TTS in plain language.

### Tradeoff Analysis

Detailed architectural tradeoffs are documented in [`docs/architectural-tradeoffs.md`](docs/architectural-tradeoffs.md):

- **LLM vs. Rules-based parsing** — LLM handles unbounded natural language variation; rules-based would need infinite regex patterns
- **DeepSeek V4 Flash vs. fine-tuned GPT-4o** — 92% accuracy vs 96%, but fine-tuning takes weeks; 8% gap handled by human escalation
- **Duffel vs. Amadeus** — Duffel offers immediate sandbox access; Amadeus requires partnership approval
- **HTTP polling vs. WebSockets** — HTTP is more reliable on mobile; 2s polling is "good enough" for a 5-minute booking flow
- **OpenAI TTS vs. ElevenLabs** — OpenAI is 5% the cost; adequate quality for the prototype
- **Hold gesture vs. hardware volume button** — On-screen hold works on all browsers; volume-button binding requires native app

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/command` | Process a voice/natural language command |
| POST | `/api/voice/speak` | Convert text to speech audio |
| POST | `/api/voice/listen` | Upload audio for transcription (Whisper fallback) |
| POST | `/api/flights/search` | Search flights (origin, destination, date) |
| GET | `/api/airports?q=...` | Search airports by name or code |
| GET | `/api/flights/offers/{offer_id}` | Get flight offer details |
| POST | `/api/wizard/session` | Start a new booking wizard session |
| POST | `/api/wizard/step` | Process a wizard step |
| POST | `/api/wizard/flights/search` | Search flights within a wizard session |
| POST | `/api/wizard/flights/select` | Select a flight offer from results |
| POST | `/api/wizard/passenger` | Add passenger details |
| POST | `/api/booking/create` | Create a new booking |
| GET | `/api/booking/{order_id}` | Get booking details |
| GET | `/api/bookings` | List all bookings |
| POST | `/api/booking/{booking_id}/cancel` | Cancel a booking |
| POST | `/api/booking/{booking_id}/cancel/confirm` | Confirm cancellation |
| POST | `/api/booking/{booking_id}/reschedule/search` | Search reschedule options |
| POST | `/api/booking/{booking_id}/reschedule/confirm` | Confirm reschedule |
| GET | `/api/user/{user_id}/history` | Get user's flight history |
| GET | `/api/user/{user_id}/portfolio` | Get travel portfolio stats |
| GET | `/api/flights/budget` | Budget flight search |
| POST | `/api/cs/create-ticket` | Create a CS support ticket |
| POST | `/api/cs/send-message` | Send a message to a user |
| GET | `/api/cs/messages/{ticket_id}` | Get messages for a ticket |
| POST | `/api/cs/book-for-user` | Agent books a flight for a user |
| GET | `/api/cs/my-ticket?session_id=...` | User checks their ticket status |
| GET | `/health` | Health check |

Swagger documentation available at `/docs` when the server is running.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Duffel API test key (free at [duffel.com](https://duffel.com))
- (Optional) OpenRouter API key for DeepSeek
- (Optional) OpenAI API key for TTS

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DUFFEL_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access
- **Frontend (dev):** http://localhost:5173
- **Frontend (built):** http://localhost:8000/app
- **Backend API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **CS Dashboard:** http://localhost:8000/cs-dashboard

---

## 📁 Project Structure

```
Wayfinder-AI/
├── backend/
│   ├── app.py                 # FastAPI entrypoint
│   ├── config.py              # Settings & environment config
│   ├── database.py            # SQLite database init & helpers
│   ├── duffel_client.py       # Duffel API client
│   ├── llm_parser_ai.py       # DeepSeek LLM parser
│   ├── airport_data.py        # Airport database & search
│   ├── .env                   # API keys (gitignored)
│   ├── .env.example           # Placeholder values
│   ├── requirements.txt
│   └── routers/
│       ├── voice.py           # Voice command router (confidence gate, emergency override)
│       ├── wizard.py          # Booking wizard session manager
│       ├── booking.py         # Flight booking CRUD
│       ├── search.py          # Flight search router
│       ├── manage.py          # Trip management (history, portfolio)
│       └── cs_dashboard.py    # CS agent dashboard endpoints
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── screens/
│   │   │   ├── VoiceScreen.tsx    # Main voice interface
│   │   │   ├── ResultsScreen.tsx  # Flight results display
│   │   │   ├── ReviewScreen.tsx   # Hold-to-confirm payment
│   │   │   ├── SuccessScreen.tsx  # Booking confirmation
│   │   │   ├── TripsScreen.tsx    # My Trips history
│   │   │   ├── CSCallScreen.tsx   # CS agent call screen
│   │   │   └── CSDashboard.tsx    # Agent dashboard (React)
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.html               # Interactive SVG architecture diagram
│   ├── handoff-protocol.md             # Human-in-the-loop handoff documentation
│   ├── confidence-threshold-escalation.md  # Safety gate documentation
│   └── architectural-tradeoffs.md      # Technology choice analysis
├── static/
│   ├── cs_dashboard.html        # Standalone CS agent dashboard
│   └── voice-simulator.html     # Voice flow testing tool
├── DEVPOST_SUBMISSION.md        # Hackathon submission form answers
└── README.md                    # This file
```

---

## 🧱 Built With

**Languages:** Python, TypeScript, JavaScript, HTML/CSS

**Frameworks:** FastAPI (backend), React + Vite + Motion (frontend)

**Cloud Services:** Cloudflare Tunnel (trycloudflare.com), OpenRouter (LLM API gateway)

**Databases:** SQLite

**APIs:** Duffel API (flight search & booking), OpenAI Whisper (speech-to-text), DeepSeek V4 Flash via OpenRouter (LLM parsing), OpenAI TTS (text-to-speech)

**Platforms:** Linux, Uvicorn (ASGI server)

**Tools:** Git, GitHub, pip/venv

**AI Coding Assistant:** Hermes Agent (autonomous AI coding assistant)

---

## 👥 Team

<!-- TODO: Add team members here -->
**Team Name:** <!-- Your team name -->

| Name | Role | 
|------|------|
| <!-- Your Name --> | Full-Stack Developer & AI Integration |

---

## 🏆 USAII Global AI Hackathon 2026

This project was built for the [USAII Global AI Hackathon 2026](https://usaii-global-ai-hackathon-2026.devpost.com/), a global virtual student competition empowering the next generation to build responsible AI solutions for real-world impact.

**Track:** Undergraduate — "AI for Life, Learning & Work"

The hackathon theme focuses on:
- **AI for Life** — Using AI to improve daily living for underserved communities
- **AI for Learning** — Educational tools and accessibility innovations
- **AI for Work** — Empowering workforce participation through technology

Wayfinder AI addresses all three: it improves travel independence (Life), makes a complex web UI accessible through voice (Learning), and enables blind/VI users to perform a task independently (Work).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Duffel](https://duffel.com/) for the flight search API and sandbox access
- [OpenAI](https://openai.com/) for Whisper STT and TTS APIs
- [DeepSeek](https://deepseek.com/) for the V4 Flash model
- [OpenRouter](https://openrouter.ai/) for LLM API gateway
- [Cloudflare](https://cloudflare.com/) for tunnel-based demo hosting
- [USAII](https://usaii.org/) for organizing this hackathon
- All blind and visually impaired travelers who inspired this project
