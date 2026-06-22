# Confidence Threshold & Escalation Protocol

> *How Wayfinder AI decides when to hand off from AI to a human agent*

## 1. Overview

Wayfinder uses a **two-layer confidence system** to determine when AI parsing is reliable enough to proceed autonomously and when it must hand off to a human agent. This prevents the AI from acting on misunderstood or garbled speech that could result in wrong bookings, financial loss, or stranded travelers.

---

## 2. Layer 1: Single-Utterance Parsing Confidence (85% Threshold)

**Trigger:** Every voice command is evaluated by the LLM parser, which returns a `confidence` score (0.00–1.00) alongside the extracted intent and parameters.

### How Confidence Is Calculated

The LLM evaluates several signals when computing confidence:

| Signal | High confidence (≥0.85) | Low confidence (<0.85) |
|--------|------------------------|------------------------|
| **Speech clarity** | User clearly stated origin, destination, date | Garbled, fragmented, or incomplete utterance |
| **Field completeness** | All required fields present | Multiple fields missing or ambiguous |
| **Ambiguity level** | One clear interpretation | Two+ competing interpretations (e.g., "Paris" → France or Texas) |
| **Noise resistance** | Clean transcription | Background noise, stuttering, mid-sentence corrections |

### Action When Confidence < 85%

```
User speaks → LLM parses → confidence = 0.72 (< 0.85)
                              │
                              ▼
                    ⚠️ ESCALATE IMMEDIATELY
                              │
                              ▼
             1. Create CS ticket with confidence score
             2. Generate ticket ID (e.g. TKT7A2B9C01)
             3. Speak: "I understood you with only 72% confidence,
                which is below my safety threshold. Your ticket ID
                is TKT7A2B9C01. Let me connect you to a customer
                service agent who can help."
             4. User can check messages: "check my messages"
```

**No retries — first low-confidence utterance triggers escalation.** This protects users from a single bad transcription turning into a wrong booking.

---

## 3. Layer 2: Cumulative Retry Threshold (3 Strikes)

**Trigger:** Even when individual utterances score ≥85%, the system tracks *cumulative* low-confidence events (confidence < 0.80) across a single session.

### How It Works

```
Session starts → retry_count = 0, low_confidence_count = 0
                │
                ▼
        User speaks → LLM parses
                │
        ┌───────┴───────┐
        ▼               ▼
   confidence ≥0.80   confidence <0.80
        │               │
        ▼               ▼
   Reset counter    Increment counter
   to 0             (low_confidence_count++)
                        │
                        ▼
               low_confidence_count ≥ 3?
              ┌────┴────┐
              YES       NO
              │         │
              ▼         ▼
         Escalate    Continue
         to CS       normally
```

### Why Two Layers?

Layer 1 (85% single-utterance) catches **clear failures** — the user said something but the AI *knows* it didn't understand well. Layer 2 (3-cycle retry) catches **degraded conditions** — ambient noise, connection issues, or complex itineraries where each individual utterance is borderline.

---

## 4. Emergency Override

**Trigger:** Specific crisis keywords bypass both confidence layers.

| Keyword | Example Utterance | Action |
|---------|-------------------|--------|
| `emergency` | "This is an emergency" | Immediate CS escalation |
| `missed my connection` | "I missed my connection" | Create urgent ticket |
| `stranded` | "I'm stranded at the airport" | Route to human agent |
| `missed my flight` | "I missed my flight" | Escalate with context |
| `help me` | "Help me, I need a human" | Direct to CS |

On trigger, the system:
1. Creates a CS ticket with the **EMERGENCY OVERRIDE** flag
2. Speaks a calming acknowledgment
3. Routes directly to an agent's queue with priority

---

## 5. Human Handoff Flow

```
         ┌─────────────────────────────────┐
         │      ESCALATION TRIGGERED       │
         │  (confidence <85%, 3 retries,   │
         │   or emergency keyword)         │
         └────────────┬────────────────────┘
                      ▼
         ┌─────────────────────────────────┐
         │    1. CS TICKET CREATED         │
         │    - Ticket ID (e.g. TKT...)    │
         │    - Session context snapshot   │
         │    - Reason for escalation      │
         │    - Last 5 utterances          │
         └────────────┬────────────────────┘
                      ▼
         ┌─────────────────────────────────┐
         │    2. USER NOTIFIED VIA TTS     │
         │    - Ticket ID shared           │
         │    - "Check messages" prompt    │
         └────────────┬────────────────────┘
                      ▼
         ┌─────────────────────────────────┐
         │    3. AGENT DASHBOARD           │
         │    - Ticket appears in sidebar  │
         │    - Agent sees full context    │
         │    - Agent can chat or call     │
         └────────────┬────────────────────┘
                      ▼
         ┌─────────────────────────────────┐
         │    4. AGENT RESPONDS            │
         │    - Send messages via chat     │
         │    - TTS reads to user          │
         │    - Agent can book flights     │
         │    - Agent can end call/close   │
         └─────────────────────────────────┘
```

---

## 6. Confidence in Practice

| Scenario | Confidence Score | Action |
|----------|-----------------|--------|
| "Book a flight from London to Tokyo on June 25th" | 0.97 | ✅ Proceed autonomously |
| "I want to go... um... to... uh... London... from... Tokyo?" | 0.64 | ❌ Escalate (Layer 1) |
| Background noise + "London Tokyo" (garbled) | 0.48 | ❌ Escalate (Layer 1) |
| "London" → "Tokyo" → "25th" (each 0.88, 0.86, 0.90) | avg 0.88 | ✅ Each utterance OK |
| "Lon..." → "...don" → "Tok..." (each 0.82, 0.85, 0.78) | 3x <0.80 | ❌ Escalate (Layer 2) |
| "Emergency, I missed my connection!" | — | ❌ Escalate (Override) |

---

## 7. Safety Guarantee

**In all cases, the user receives:**
- A clear **ticket ID** they can reference
- An audio message explaining why escalation happened
- The ability to check for agent messages by saying "check my messages"
- A CS agent who has full context of the conversation so far

**No booking is ever finalized on a sub-85% confidence parse.**