# ✈️ Wayfinder AI — Voice-First Accessible Flight Booking

[![USAII Global AI Hackathon 2026](https://img.shields.io/badge/USAII-Global_AI_Hackathon_2026-4F46E5)](https://usaii-global-ai-hackathon-2026.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Wayfinder AI** is a voice-first travel assistant that lets **blind and visually impaired users** book flights using only their voice. Built for the USAII Global AI Hackathon 2026 — **Undergraduate Track: "AI for Life, Learning & Work"**.

> 🎯 **Problem:** 285M+ visually impaired people worldwide can't use standard flight booking UIs. Screen readers struggle with dynamic flight search interfaces.
>
> ✅ **Solution:** A conversational AI assistant that listens, understands, confirms, and books — all by voice.

---

## 🎥 Demo

<!-- Add demo video link after recording -->
<!-- https://your-demo-video-url.com -->

![Wayfinder AI Splash](screenshots/splash.png)
![Wayfinder AI Voice](screenshots/voice.png)
![Wayfinder AI Results](screenshots/results.png)

---

## 🌟 Key Features

### 🎙️ Voice-First by Design
Every interaction starts and ends with voice. The greeting, flight results, and booking confirmation are all spoken aloud. The screen is a secondary reference — the primary interface is audio.

### 🌐 Bilingual, Free-Form Input
Speak in **any language** — the system detects your language, translates internally to English for processing, and responds back in your language. No rigid command formats needed.

### 🛡️ Flight-Only Hard Wall
The AI only processes flight booking requests. Non-flight queries (weather, jokes, random chat) are politely declined. This prevents confusion and keeps the assistant focused.

### 🔄 Conversational Flow
Like a real travel agent, the assistant asks for missing information step by step:
- *"Book a flight from New York to London"* → "What date would you like to travel?"
- *"Tomorrow"* → "I found 165 flights. The cheapest is Iberia at £432. Shall I confirm?"

### 💰 Zero Paid API Dependency
| Feature | API | Cost |
|---------|-----|------|
| Speech → Text | Browser Web Speech API | **Free** |
| Text → Speech | gTTS | **Free** |
| Flight Search | Duffel API (test mode) | **Free** |
| NLP / Language | Custom parser + Google Translate | **Free** |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                     │
│           React + TypeScript + Vite             │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Web      │  │ gTTS     │  │ Accessible   │  │
│  │ Speech   │  │ Audio    │  │ UI (large    │  │
│  │ API (STT)│  │ Playback │  │ touch, high  │  │
│  └──────────┘  └──────────┘  │ contrast)    │  │
│                              └──────────────┘  │
│                      │                          │
│              Vite Proxy (/api)                  │
│                      │                          │
└──────────────────────┼──────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────┐
│                    BACKEND                      │
│              Python FastAPI                     │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ NLP      │  │ Voice    │  │ Booking      │  │
│  │ Parser   │  │ Router   │  │ Router       │  │
│  │ (Bilingual) │ (TTS,    │  │ (CRUD +      │  │
│  │          │  │ Command) │  │  Duffel API) │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                      │                          │
│              ┌───────┴───────┐                  │
│              │  Wizard       │                  │
│              │  Session Mgr  │                  │
│              └───────────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Duffel API test key (free at [duffel.com](https://duffel.com))

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your DUFFEL_API_KEY
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access
- **Frontend**: https://localhost:5173
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Motion (animations) |
| **Backend** | Python FastAPI, SQLite |
| **Flight Search** | Duffel API |
| **Speech → Text** | Web Speech API (browser-native) |
| **Text → Speech** | gTTS |
| **NLP** | Custom bilingual parser (Google Translate for non-English) |
| **Deployment** | Ubuntu, HTTPS (self-signed cert for dev) |

---

## 🧠 Responsible AI Design

Wayfinder AI was built with **Responsible AI** as a core principle, not an afterthought:

### Failure Mode Mitigation

| Risk | Mitigation |
|------|-----------|
| Speech misrecognizes a city | Assistant reads back full route before booking |
| Wrong date is parsed | Resolved date is spoken aloud for confirmation |
| Background noise garbles input | Text input always available as fallback |
| gTTS fails (server overload) | Visual status + error text with "Try Again" |
| User speaks non-flight command | Polite "I can only help with flight bookings" response |

### Ethical Principles
- **Privacy**: All speech processing is done in-browser. No audio leaves the device.
- **Human Oversight**: Every booking requires explicit voice confirmation.
- **Inclusivity**: Bilingual support + high-contrast UI + large touch targets.
- **Transparency**: Error messages explain what went wrong in plain language.

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/command` | Process a voice/natural language command |
| POST | `/api/voice/speak` | Convert text to speech audio |
| POST | `/api/voice/listen` | Upload audio for transcription (Whisper fallback) |
| GET | `/api/flights/search` | Search flights (origin, destination, date) |
| POST | `/api/bookings/create` | Create a new booking |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/{id}` | Get booking details |
| POST | `/api/bookings/{id}/cancel` | Cancel a booking |
| POST | `/api/bookings/{id}/reschedule` | Reschedule a booking |
| GET | `/api/portfolio` | Get travel portfolio stats |
| GET | `/health` | Health check |

---

## 🏆 USAII Global AI Hackathon 2026

**Track:** Undergraduate — "AI for Life, Learning & Work"  
**Deadline:** June 22, 2026 @ 3:45 AM UTC  
**Team:** <!-- Add your team members here -->

This project was built for the [USAII Global AI Hackathon 2026](https://usaii-global-ai-hackathon-2026.devpost.com/), a global virtual student competition empowering the next generation to build responsible AI solutions for real-world impact.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Duffel](https://duffel.com/) for the flight search API
- [gTTS](https://github.com/pndurette/gTTS) for free text-to-speech
- [USAII](https://usaii.org/) for organizing this hackathon