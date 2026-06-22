# Human-in-the-Loop Handoff Protocol

> *What happens when AI hands off to a human agent, and what the human can do that AI cannot*

## 1. Handoff Trigger Points

The system escalates to a human agent through three independent pathways:

### Pathway A: Low AI Parsing Confidence (<85%)
- **Trigger:** LLM parser returns confidence < 0.85 on any single utterance
- **Response:** Immediate ticket creation, user notified via TTS
- **Example:** User mumbles "Lunnon to T'kyo" → confidence 0.52 → escalate

### Pathway B: Cumulative Retry Exceeded (3 Strikes)
- **Trigger:** 3 consecutive utterances each scored <0.80 confidence
- **Response:** Ticket created, user asked if they want to continue or escalate
- **Example:** Noisy environment where each utterance is borderline

### Pathway C: Emergency Override
- **Trigger:** Crisis keywords detected ("emergency", "missed connection", "stranded")
- **Response:** Urgent ticket with priority flag, immediate routing
- **Example:** "I missed my connection in Frankfurt!" → priority escalation

### Pathway D: User-Requested Help
- **Trigger:** User says "help" / "talk to a human" during mid-booking flow
- **Response:** Ticket created with context of current booking state
- **Example:** User says "I need a human" during name collection step

---

## 2. What the Human Agent Can Do (That AI Cannot)

| Capability | AI | Human Agent | Why Human Is Needed |
|------------|----|--------------|---------------------|
| **Multi-city itineraries** | ❌ | ✅ Complex routing | AI parser limited to A→B on one date |
| **Split payments** | ❌ | ✅ Multiple payment methods | No payment integration yet |
| **Special assistance requests** | ⚠️ Basic | ✅ Full | Wheelchair, visual, medical, dietary |
| **Infant/child bookings** | ❌ | ✅ | Age verification, seat restrictions |
| **Unaccompanied minor** | ❌ | ✅ | Documentation & airline policies |
| **Group bookings (6+)** | ⚠️ Basic (1-5) | ✅ Any size | Group fare rules, seat assignments |
| **Travel insurance** | ❌ | ✅ | Policy selection, documentation |
| **Visa/immigration questions** | ❌ | ✅ | Country-specific rules, document checks |
| **Error resolution** | ❌ | ✅ | Rebooking cancelled flights, refunds |
| **Ambiguity arbitration** | ⚠️ Escalates | ✅ Resolves | "I meant Paris, France" vs "Paris, Texas" |
| **After-hours support** | ✅ 24/7 | ⚠️ Business hours | Tier-1 triage by AI, complex issues deferred |

---

## 3. Agent Dashboard Capabilities

When a ticket is created, the human agent uses the **CS Agent Dashboard** to interact with the user:

### Chat Tab
- Read all conversation context (user's utterances, AI responses, confidence scores)
- Send text messages → read aloud to user via TTS
- Receive user's voice messages → transcribed via Whisper STT
- View full ticket history with timestamps

### Book Flight Tab
- Search flights using **plain city names** (not just IATA codes): "London" → LHR, "Tokyo" → NRT
- Override any AI-parsed fields if they were wrong
- Book flights that **bypass the confidence threshold** (humans are trusted)
- Booking confirmation sent as TTS announcement to user's device

### Call Feature
- Initiate a voice call directly to the user's device
- Ringing UI on user's end with accept/decline
- Real-time two-way audio conversation
- Agent can walk the user through complex scenarios verbally

---

## 4. Handoff Sequence (Detailed)

```
Phase 1: TRIGGER
─────────────────
  Trigger fires → system captures:
    - Session ID
    - Last 5 utterances + AI responses  
    - Current booking state (fields collected so far)
    - Confidence scores for each utterance
    - Trigger reason (low_confidence / retry / emergency / help)

Phase 2: TICKET CREATION
─────────────────────────
  CS ticket created with:
    - Unique ticket ID (TKTXXXXXXXX)
    - User name (from session if available, else "Guest")
    - Issue description (e.g., "AI parsing confidence 0.52")
    - Call status: "pending"
    - Timestamp

Phase 3: USER NOTIFICATION
───────────────────────────
  User hears via TTS:
    - Why escalation happened
    - Their ticket ID
    - Instructions: "Say 'check my messages' to see agent replies"
    - Reassurance: "An agent will be with you shortly"

Phase 4: AGENT ENGAGEMENT
──────────────────────────
  Agent sees ticket in dashboard sidebar:
    - User name, ticket status, timestamp
    - Full conversation context
    - Can immediately send messages or initiate call

  Agent actions:
    a) Send welcome message → user hears via TTS
    b) Call user directly → voice conversation on both ends
    c) Search flights for user using city names
    d) Book flight → user gets TTS + visual confirmation

Phase 5: RESOLUTION
────────────────────
  Agent marks ticket as "resolved"
  User returns to AI-driven flow for future requests
```

---

## 5. Communication Modes During Escalation

### Mode A: Async Messaging (Default)
```
Agent types message → saved to ticket → user polls → TTS reads aloud
User speaks → Whisper transcribes → saved as message → agent reads
```
- Polling interval: 2 seconds
- Latency: ~3-5 seconds end-to-end
- Best for: Non-urgent questions, information sharing

### Mode B: Voice Call (For Complex Cases)
```
Agent clicks "Call" → user sees ringing UI → user accepts → 
Real-time audio channel established
```
- User can speak naturally → Whisper → send as message
- Agent messages read aloud via TTS
- Best for: Complex itineraries, urgent situations, user frustration

---

## 6. Fallback Guarantees

| Failure Mode | Mitigation |
|-------------|------------|
| AI confidence <85% on ALL utterances | Every low-confidence utterance immediately escalates — no booking is ever made on low certainty |
| Agent doesn't respond | Ticket stays open, user can check messages anytime, can also re-enter AI flow |
| Connection lost during handoff | Ticket persists in DB, agent sees it on reconnection, user can re-query messages |
| User can't hear TTS | All messages stored in ticket history, available on next login |
| Emergency during AI-only hours | Emergency override creates priority ticket — agent can call user back |