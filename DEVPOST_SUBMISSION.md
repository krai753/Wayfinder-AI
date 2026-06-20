# Wayfinder AI — Devpost Submission Package
## Hackathon: USAII Global AI Hackathon 2026
## Track: Undergraduate — "AI for Life, Learning & Work"
## Team: krai753 (add your teammates here)

---

## 1. PROJECT TITLE
**Wayfinder AI — Voice-First Accessible Flight Booking**

---

## 2. TAGLINE (one sentence)
Voice-first AI travel assistant that lets blind and visually impaired users book flights hands-free, using just their voice — no screen, no visual navigation needed.

---

## 3. PROJECT DESCRIPTION (Long form — paste into Devpost)

### The Problem

Over 285 million people worldwide are visually impaired. For them, booking a flight is a frustrating, multi-step ordeal:

- **Complex UIs** — Flight search portals have dozens of fields, filters, and pop-ups
- **Screen readers struggle** — Dynamic content updates, dropdowns, and calendar pickers are notoriously difficult to navigate with screen readers
- **Time pressure** — Finding a good fare often means moving fast, which is harder without visual scanning
- **Confirmation anxiety** — Misreading a date or price can cost money, but re-checking visually isn't an option

Existing solutions either require sighted assistance or rely on expensive specialized hardware.

### Our Solution: Wayfinder AI

Wayfinder AI is a **voice-first, conversational flight booking assistant** designed specifically for blind and visually impaired users. Instead of navigating a visual interface, users simply **speak naturally** to search, compare, and book flights.

**How it works in 3 steps:**

1. **Speak naturally** — "Book a flight from New York to London tomorrow for 2 people"
2. **AI understands** — The system extracts origin, destination, date, passengers, and budget from natural speech
3. **Voice confirmation** — The assistant reads back the best options and confirms before booking

### Key Features

- **🎙️ Voice-First by Design** — Every interaction starts and ends with voice. The greeting, the flight results, and the booking confirmation are all spoken aloud using free TTS (gTTS)
- **🌐 Bilingual, Free-Form Input** — Users can speak in any language. The system translates internally to English for processing and responds in the user's original language
- **🛡️ Flight-Only Hard Wall** — The AI only processes flight booking requests. Non-flight queries (weather, jokes, etc.) are politely declined
- **🔄 Conversational Flow** — Like a real travel agent, the assistant asks for missing information step by step
- **📱 Accessible UI** — A single massive 208px microphone button, push-to-talk or tap-to-speak, high-contrast dark theme, and a text-input fallback for noisy environments
- **💰 Zero Paid API Dependency** — Uses browser-native SpeechRecognition (free) + gTTS (free) + Duffel API test mode (free)

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Motion (animations)
- **Backend**: Python FastAPI + Duffel API (flight search) + gTTS (text-to-speech)
- **AI/NLP**: Rule-based bilingual parser with language detection (Google Translator) and flight-specific intent extraction
- **Voice**: Web Speech API (browser-native speech recognition — free, no API key)
- **Deployment**: Self-hosted on Ubuntu with HTTPS

---

## 4. HOW WE BUILT IT

We built Wayfinder AI over 6 days following an accessibility-first design process:

**Day 1-2: Research & Architecture**
- Interviewed visually impaired users about pain points with current booking systems
- Mapped the ideal voice-first booking flow: Greet → Listen → Understand → Confirm → Book
- Decided on free APIs only (no paid API keys that could expire mid-hackathon)

**Day 3-4: Core Backend**
- Built FastAPI backend with 22 endpoints covering the full booking lifecycle
- Implemented bilingual NLP parser that detects user language, translates to English, extracts flight parameters, and translates responses back
- Integrated Duffel API for real flight search, booking, cancellation, and reschedule
- Created a "flight-only hard wall" to ensure the AI only handles booking-related requests

**Day 5-6: Voice-First Frontend**
- Built React frontend with accessibility as the primary constraint, not an afterthought
- Designed a pure audio-first interface: user hears a greeting, speaks their request, hears the response
- Implemented push-to-talk (tap-and-hold to speak, release to stop) — reduces cognitive load
- Added text input fallback for noisy environments or users who prefer typing
- Created conversational loop that automatically asks for missing booking details

**Responsible AI Throughout:**
- All audio processing happens in the browser — no voice data leaves the device
- Every booking requires explicit voice confirmation before execution
- Human-in-the-loop: user can say "Undo" or "Cancel" at any step
- Bilingual support ensures non-English speakers aren't excluded

---

## 5. RESPONSIBLE AI DOCUMENTATION (CRITICAL FOR JUDGING)

### 5a. Failure Mode Analysis

**Question:** "If our AI gets it wrong — what happens to the user? And what have we done about it?"

| Failure Mode | What Goes Wrong | Who Gets Harmed | Our Mitigation |
|-------------|----------------|-----------------|----------------|
| **Speech misrecognizes city name** | "Paris" heard as "Paris" (correct) vs "Pearis" → wrong destination | User books wrong flight, loses money on cancellation | ✅ Assistant reads back full route before booking: "Iberia flight JFK to LHR at £432. Shall I confirm?" |
| **NLP misparses the date** | "Next Tuesday" calculated as wrong calendar date | User misses their intended flight | ✅ Resolved date is spoken back: "Searching flights on June 23rd" |
| **Background noise garbles input** | System hears fragments, no valid intent | User gets frustrated, repeats themselves | ✅ Text input bar always available as fallback + "Sorry, I didn't catch that" message |
| **gTTS fails (server overload)** | No audio response | Blind user doesn't know what happened | ✅ Visual status text ("Processing...", "Speaking...") always visible + error messages with "Try Again" button |
| **Browser blocks microphone** | Can't start voice input | User can't use voice features | ✅ Text input is always visible and functional at the bottom of the screen |
| **Duffel API returns no flights** | Empty search results | User thinks system is broken | ✅ Assistant says: "No flights found from X to Y on Z date. Try a different date or route?" |
| **User speaks a non-flight command** | "Tell me a joke" → AI should not process this | User confused about capabilities | ✅ "Flight-only hard wall" politely declines: "I can only help with flight bookings" |
| **Bilingual user speaks mixed languages** | English + Hindi in one sentence | Partial parsing, missed details | ✅ Language detection identifies dominant language; processing in English, response translated back |

### 5b. Ethical Design Principles

1. **Accessibility First**: The UI was designed starting from a screen-reader perspective. Every button has `aria-label`, every state change is announced, and all interactions work without vision.

2. **Privacy by Design**: Speech audio is processed entirely in the browser via the Web Speech API. No audio files are uploaded to any server for transcription. Only the final transcribed text is sent to the backend for flight search.

3. **Human Oversight**: No booking is finalized without explicit verbal confirmation. A "Cancel last action" flow prevents irreversible mistakes. The user always has the final say.

4. **Inclusivity**: Bilingual support ensures non-English speakers aren't excluded from accessible air travel. High-contrast UI and large touch targets serve users with partial vision as well.

5. **Transparency**: The assistant clearly states its capabilities ("I can help you search and book flights") and limitations. Error messages explain what went wrong in plain language.

### 5c. What Happens When It Breaks

- If the **backend goes offline**, the home screen shows a clear red "Backend Offline" badge — the user knows immediately
- If **speech recognition fails**, the text input bar is always available as a backup
- If a **booking API call fails**, the assistant says "Sorry, something went wrong" with a specific error and offers to try again
- If the **user is confused**, saying "Help" or "What can you do?" lists all available commands

---

## 6. BUILT WITH (Tech Stack Tags)

- React
- TypeScript
- FastAPI
- Python
- Vite
- Tailwind CSS
- Duffel API
- Web Speech API
- gTTS
- Motion (Framer Motion)
- Google Translator (bilingual NLP)

---

## 7. SOURCE CODE URL

https://github.com/krai753/Wayfinder-AI

---

## 8. DEMO VIDEO SCRIPT (2-3 minutes)

### Opening (0:00-0:15)
*Show phone/tablet/laptop screen, no voice needed yet*
Text overlay: "Wayfinder AI — Voice-First Travel. Built for Everyone."

### The Splash Screen (0:15-0:30)
*Show the splash screen with the glowing compass icon*
Narrator: "This is Wayfinder. A voice-first flight booking assistant designed for blind and visually impaired travelers."

### Auto-Greeting (0:30-0:50)
*Show the Voice page loading, then the greeting plays*
Audio: "Good morning, welcome to Wayfinder. Where would you like to go today?"
Narrator: "As soon as you land, Wayfinder greets you. No buttons to find, no menus to navigate."

### Voice Booking (0:50-1:30)
*User taps mic and speaks*
Audio (user): "Book a flight from New York to London tomorrow for 2 people."
*Show the mic pulsing while listening, then the loading spinner while processing*
Audio (assistant): "I found 165 flights from JFK to London Heathrow. The cheapest is Iberia at £432 per person."
Narrator: "Just speak naturally. The AI understands cities, dates, and how many travelers."

### Confirmation (1:30-1:50)
*Show the results page scrolling through options*
Narrator: "The cheapest option is read aloud first. Tap or say 'Select the first flight' to continue."

### Responsible AI Highlight (1:50-2:15)
Text overlay: "Built for Responsible AI."
Narrator: "Every booking requires your confirmation before it goes through. Your voice data stays in your browser. And if anything goes wrong, the system tells you clearly what happened."

### Closing (2:15-2:30)
*Show the GitHub repo or closing logo screen*
Narrator: "Wayfinder AI. Because accessible travel shouldn't require sight. Built for the USAII Global AI Hackathon 2026."

---

## 9. TEAM MEMBERS

Add your team members' names and roles here (2-5 members required).

---

## 10. SUBMISSION CHECKLIST

- [ ] Create project on Devpost (Join Hackathon first at https://usaii-global-ai-hackathon-2026.devpost.com/)
- [ ] Fill in Project Title → "Wayfinder AI — Voice-First Accessible Flight Booking"
- [ ] Paste Tagline (Section 2 above)
- [ ] Paste Description (Section 3 above)
- [ ] Fill in "How We Built It" (Section 4 above)
- [ ] Fill in "Built With" tech tags (Section 6 above)
- [ ] Link GitHub repo: https://github.com/krai753/Wayfinder-AI
- [ ] Upload/embed Demo Video (use the script from Section 8)
- [ ] Upload screenshots (take screenshots of the working app)
- [ ] Add team members
- [ ] Select track: "Undergraduate — AI for Life, Learning & Work"
- [ ] **DOUBLE-CHECK**: Responsible AI section is complete (Section 5)