# Wayfinder AI — Frontend Build Instructions

## Target Users: Blind & Visually Impaired Travelers

This is a **voice-first** app. Users should rarely need to see the screen. Everything should work by **speaking and listening**.

---

## 🔴 P0 — MUST HAVE (Build These First)

### 1. Voice Command Screen (The Main Interface)
**File:** `src/components/screens/VoiceScreen.tsx`

This is the **home screen for blind users**. The first thing they see.

```
┌──────────────────────────────┐
│                              │
│     [Large Mic Button]       │  ← Tap or tap anywhere to speak
│     "Tap & Speak"            │
│                              │
│     ─── Listening... ───     │  ← Animated voice wave
│     "Book a flight from      │
│      New York to London      │
│      next Tuesday"           │  ← Transcript appears live
│                              │
│     ┌──────────────────┐     │
│     │ Found 4 flights  │     │  ← AI response shown & read aloud
│     │ under $300       │     │
│     └──────────────────┘     │
└──────────────────────────────┘
```

**Props it accepts:**
```typescript
interface VoiceScreenProps {
  onCommand: (text: string) => Promise<VoiceCommandResult>;
  onSpeak: (text: string) => Promise<Blob>;
  onListen: (audio: Blob) => Promise<string>;
}
```

**Accessibility must-haves:**
- ✅ **Auto-focus mic** — no need to find a button
- ✅ **Large tap target** — whole screen = tap to speak
- ✅ **Live transcript** — shows what AI heard (for partially sighted users)
- ✅ **Auto TTS** — every response is read aloud immediately
- ✅ **High contrast** — white text on dark background
- ✅ **Voice wave animation** — shows it's listening
- ✅ **Haptic feedback** (vibrate on start/stop recording)

**API calls to use:**
```typescript
// User says something → send to backend
const result = await api.voiceCommand(userSpeech);
// Show result.response_text on screen
// Auto-play: await api.speak(result.response_text)
```

---

### 2. Flight Results Screen (After Search)
**File:** `src/components/screens/ResultsScreen.tsx`

Shows flight options in a **simple, scannable list**. Read aloud by TTS.

```
┌──────────────────────────────┐
│  JFK → LHR  •  Tue Jun 23   │
│                              │
│  ┌─ 1. Iberia ────────────┐ │
│  │   £227  •  12h 58m     │ │  ← Cheapest first
│  │   Non-stop             │ │
│  └─── Select ─────────────┘ │
│                              │
│  ┌─ 2. American Airlines ─┐ │
│  │   £230  •  12h 58m     │ │
│  │   Non-stop             │ │
│  └─── Select ─────────────┘ │
│                              │
│  [🔙 Back]  [🔊 Read All]  │
└──────────────────────────────┘
```

**Accessibility must-haves:**
- ✅ **Auto-read** the cheapest option aloud first
- ✅ **Big touch targets** for selecting flights
- ✅ **Sort by price** (cheapest first — blind users want this)
- ✅ **Duration in clear terms** ("12 hours 58 minutes" not "12h58m")
- ✅ **Read All button** — reads all options aloud
- ✅ **High contrast** flight cards

**API call:**
```typescript
const results = await api.searchFlights("JFK", "LHR", "2026-06-23");
// results.offers[0].price, .airline, .duration, etc.
```

---

### 3. Booking Confirmation Screen
**File:** `src/components/screens/ConfirmScreen.tsx`

After selecting a flight and entering name, show summary and confirm.

```
┌──────────────────────────────┐
│     ✈️ Review Your Trip      │
│                              │
│  From:  New York (JFK)       │
│  To:    London (LHR)         │
│  Date:  June 23, 2026        │
│  Flight: Iberia • £227       │
│        12h 58m • Non-stop    │
│  Passenger: Priya Sharma     │
│  Assistance: None            │
│                              │
│  ┌────────────────────────┐  │
│  │  ✅ Confirm Booking    │  │
│  └────────────────────────┘  │
│                              │
│  [🔙 Edit]  [🔊 Read Summary]│
└──────────────────────────────┘
```

**Accessibility must-haves:**
- ✅ **TTS reads the full summary** automatically
- ✅ **Large Confirm button** — easy to tap
- ✅ **Voice confirm** — user can say "Yes, book it"
- ✅ **Clear status after booking** — "Your flight is booked! Reference: E4NLSC"

**API calls:**
```typescript
// Step through wizard
await api.wizardSelectFlight(sessionId, offerId);
await api.wizardPassenger(sessionId, "Priya Sharma");

// Book it
const booking = await api.createBooking(sessionId);
// booking.booking_reference, .total_amount
```

---

### 4. Input Forms (Airport + Passenger + Date)
**File:** `src/components/screens/AirportInput.tsx`, `PassengerInput.tsx`, `DatePicker.tsx`

For when voice input isn't possible. Simple, large, accessible forms.

```
┌──────────────────────────────┐
│   Where are you flying from? │
│                              │
│  ┌────────────────────────┐  │
│  │  [🔍] Search airport.. │  │  ← Big input, auto-focus
│  └────────────────────────┘  │
│                              │
│  ┌─ London Heathrow (LHR) ─┐ │
│  ├─ London Gatwick (LGW)  ─┤ │  ← Big tap targets
│  ├─ London Stansted (STN) ─┤ │
│  └─────────────────────────┘ │
│                              │
│  [🔙 Back]  [🔊 Say It]     │  ← Or just speak
└──────────────────────────────┘
```

**Accessibility must-haves:**
- ✅ **Voice alternative** — "Say It" button triggers voice mode
- ✅ **Auto-complete** with fuzzy search
- ✅ **Auto-read results** aloud
- ✅ **Large text and buttons**

**API calls:**
```typescript
const airports = await api.searchAirports("london");
// airports.airports[0].name, .iata, .city
```

---

## 🟡 P1 — IMPORTANT (Build Next)

### 5. My Trips (Booking History)
**File:** `src/components/screens/TripsScreen.tsx`

```
┌──────────────────────────────┐
│   My Trips                   │
│                              │
│  ┌─ London → New York ────┐ │
│  │  Jul 15, 2026          │ │  ← Tap for detail + cancel/reschedule
│  │  ✅ Confirmed          │ │
│  │  Ref: E4NLSC           │ │
│  └────────────────────────┘ │
│                              │
│  ┌─ New York → Tokyo ─────┐ │
│  │  Aug 3, 2026           │ │
│  │  ✅ Confirmed          │ │
│  │  Ref: BA7X2F           │ │
│  └────────────────────────┘ │
└──────────────────────────────┘
```

**Accessibility:** TTS reads: *"You have 2 trips. Trip 1: London to New York on July 15th. Confirmed. Reference E4NLSC."*

**API:** `const history = await api.getHistory("user_123");`

### 6. Cancel Booking Flow
**File:** Inside TripDetail or separate

```
┌──────────────────────────────┐
│   🔴 Cancel Booking?         │
│                              │
│   Flight: LHR → JFK          │
│   Date:   July 15, 2026      │
│                              │
│   Refund: £217.56            │
│                              │
│   [❌ Yes, Cancel]           │  ← Big red button
│   [🔙 Keep Booking]          │
└──────────────────────────────┘
```

**Accessibility:** TTS: *"Are you sure you want to cancel? You'll get £217.56 back."*

**API:** 
```typescript
const cancelInfo = await api.cancelBooking(bookingId);
// Shows refund amount
await api.confirmCancellation(bookingId, cancelInfo.cancellation_id);
```

### 7. Reschedule Booking Flow
**File:** Inside TripDetail or separate

```
┌──────────────────────────────┐
│   Move Flight to New Date    │
│                              │
│   Current: Jul 15 → Jul 20   │
│                              │
│   Reschedule Options:        │
│   ┌─ Jul 20 - British Air ─┐ │
│   │  Total: £317 (+£25 fee)│ │
│   └─── Select ─────────────┘ │
│                              │
│   [🔙 Back]                  │
└──────────────────────────────┘
```

**Accessibility:** TTS reads price difference aloud.

**API:**
```typescript
const options = await api.rescheduleSearch(bookingId, "2026-07-20");
await api.rescheduleConfirm(bookingId, options.change_offers[0].offer_id);
```

### 8. Portfolio / Stats
**File:** `src/components/screens/PortfolioScreen.tsx`

```
┌──────────────────────────────┐
│   Your Travel Stats          │
│                              │
│   ✈️ 12 Total Trips          │
│   💰 £2,450 Total Spent     │
│   🌍 Favourite: LHR → JFK   │
│   📅 3 Upcoming Trips       │
│   ❌ 1 Cancelled             │
└──────────────────────────────┘
```

**Accessibility:** TTS reads all stats in one go.

**API:** `const stats = await api.getPortfolio("user_123");`

---

## 🟢 P2 — NICE TO HAVE

### 9. Budget Slider/Input
**File:** Budget filter on Results screen

A large slider: *"What's your budget?"* with voice input: *"Under $300"*

**API:** `const budget = await api.budgetSearch("JFK", "LHR", "2026-07-15", 300);`

### 10. AI Chat Assistant
**File:** `AssistantScreen.tsx`

Simple chat interface — user types or speaks, AI responds. Maps to `/api/voice/command`.

### 11. Profile & Settings
**File:** `ProfileScreen.tsx`

User name, accessibility preferences (font size, voice speed, assistance type).

---

## 🏗️ How to Build & Run

```bash
cd frontend
npm install
npm run dev    # Opens at http://localhost:5173
```

Backend URL is already set in `src/services/api.ts` → `http://139.180.203.171:8000/api`

---

## 📋 Handoff Summary for Frontend Developer

| Priority | Screen | File | API to Use | Key Accessibility |
|:--------:|--------|------|-----------|-------------------|
| 🔴 P0 | Voice Command | `VoiceScreen.tsx` | `api.voiceCommand()` | Auto-mic, auto-TTS, big tap target |
| 🔴 P0 | Flight Results | `ResultsScreen.tsx` | `api.searchFlights()` | Auto-read cheapest, sort by price |
| 🔴 P0 | Booking Confirm | `ConfirmScreen.tsx` | `api.wizardPassenger()`, `api.createBooking()` | Voice confirm, read summary |
| 🔴 P0 | Airport Input | `AirportInput.tsx` | `api.searchAirports()` | Voice alternative, auto-complete |
| 🟡 P1 | My Trips | `TripsScreen.tsx` | `api.getHistory()` | TTS reads all trips |
| 🟡 P1 | Cancel Flow | `CancelScreen.tsx` | `api.cancelBooking()`, `api.confirmCancellation()` | Read refund aloud |
| 🟡 P1 | Reschedule Flow | `RescheduleScreen.tsx` | `api.rescheduleSearch()`, `api.rescheduleConfirm()` | Read price diff |
| 🟡 P1 | Portfolio Stats | `PortfolioScreen.tsx` | `api.getPortfolio()` | Read all stats |
| 🟢 P2 | Budget Filter | (in Results) | `api.budgetSearch()` | Voice budget input |
| 🟢 P2 | AI Chat | `AssistantScreen.tsx` | `api.voiceCommand()` | Text + voice |