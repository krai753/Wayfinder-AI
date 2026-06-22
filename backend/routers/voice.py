"""
Wayfinder Backend — Voice Command Router
Unified voice interface: "Book New York to London next Tuesday"
Now delegates intent handlers to voice_actions.py and shared helpers to helpers.py.
"""
import json
import logging
import uuid
import asyncio
from datetime import datetime, date
from pathlib import Path
from fastapi import APIRouter, HTTPException, File, UploadFile, Query
from fastapi.responses import FileResponse

from models import VoiceCommandRequest, VoiceCommandResponse
from helpers import resolve_date, resolve_iata, translate_text
from llm_orchestrator import llm
from llm_parser_ai import ai_parser
from voice_engine import voice
from voice_actions import (
    handle_search_flights, handle_cancel_booking, handle_reschedule_booking,
    handle_view_history, handle_view_portfolio, handle_search_with_budget,
    handle_select_flight, handle_provide_name, handle_confirm_booking,
    save_extracted_fields, get_missing_booking_fields, needs_cs_escalation,
    increment_retry, reset_retry, check_retry_escalation,
)
from airport_data import search_airports, get_airport
from database import create_cs_ticket, get_cs_ticket_by_session, get_user_agent_messages, update_session as update_db_session
from wizard_manager import create_wizard_session, get_wizard_session, process_step

router = APIRouter(prefix="/api/voice", tags=["voice"])
logger = logging.getLogger("wayfinder.voice_router")

# ── Non-English text detection ──────────────────────────────────
# Basic check: if >50% of chars are non-ASCII, treat as foreign
ENGLISH_FALLBACKS = {
    "collect_booking_info": "What is the passenger's full name?",
    "search_flights": "I found some flights. Would you like to book one?",
    "select_flight": "Say 'the first one' or 'the cheapest' to select a flight.",
    "provide_name": "Thank you. Please continue with your booking.",
    "confirm_booking": "Your booking is confirmed!",
    "help": "I can help you book flights. Try saying 'book a flight from New York to London'.",
    "cancel_booking": "I'll help you cancel a booking.",
    "reschedule_booking": "I'll help you reschedule a booking.",
    "view_history": "Here are your recent trips.",
    "view_portfolio": "Here are your travel stats.",
}


def is_english(text: str) -> bool:
    """Quick check if text is likely English (>80% ASCII)."""
    if not text:
        return True
    ascii_chars = sum(1 for c in text if ord(c) < 128 or c in " '.,!?-:;")
    return ascii_chars / len(text) > 0.8


def sanitize_response_text(text: str, intent: str) -> str:
    """If the AI returned non-English text, replace with hardcoded English."""
    if text and is_english(text):
        return text
    fallback = ENGLISH_FALLBACKS.get(intent, "I understood your request. How can I help you?")
    logger.warning(f"Non-English response detected for intent={intent}, replacing with fallback. Original: {text[:50]}...")
    return fallback


# ── MAIN VOICE COMMAND ────────────────────────────────────────────


@router.post("/command", response_model=VoiceCommandResponse)
async def voice_command(req: VoiceCommandRequest):
    """
    Process a voice/natural language command.
    Accepts text like "Book a flight from New York to London next Tuesday under $400"
    Returns structured response with intent, parameters, and spoken response text.
    """
    # 1. Get session context
    context = None
    if req.session_id:
        session = get_wizard_session(req.session_id)
        if session:
            context = {
                "session_id": req.session_id,
                "current_step": session.get("current_step"),
                "origin": session.get("origin"),
                "destination": session.get("destination"),
                "departure_date": session.get("departure_date"),
            }
    logger.info(f"[DEBUG] voice_command: text={req.text!r}, session_id={req.session_id!r}, context={context}")

    # 2. AI parses the command (LLM first, rule-based fallback)
    try:
        # Timeout wrapper — AI parser sometimes hangs
        ai_task = asyncio.create_task(ai_parser.parse(req.text, context or {}))
        try:
            ai_result = await asyncio.wait_for(ai_task, timeout=15.0)
        except asyncio.TimeoutError:
            logger.warning(f"AI parser timed out for text={req.text!r}, falling back to rule-based")
            ai_result = None
        if ai_result:
            result = ai_result
            logger.info(f"AI parser → intent={result['intent']}")
        else:
            result = await llm.parse_command(req.text, context)
            logger.info(f"Rule-based parser → intent={result['intent']}")
    except Exception as e:
        logger.error(f"LLM parse failed: {e}")
        return VoiceCommandResponse(
            intent="help", parameters={"error": str(e)},
            response_text="Sorry, I had trouble understanding that. Could you please rephrase?",
        )

    intent = result.get("intent", "help")
    params = result.get("parameters", {})
    response_text = result.get("response_text", "")

    # ── LANGUAGE FIX: Force English always ──────────────────
    # The AI parser sometimes hallucinates foreign languages
    if "user_lang" in params:
        del params["user_lang"]

    # Sanitize response_text — if it looks non-English, use a hardcoded fallback
    response_text = sanitize_response_text(response_text, intent)

    # ── MANUAL PASSENGER COUNT DETECTION ───────────────────
    if req.session_id and result.get("intent") in ("unknown", "help", "search_flights", "confirm_booking"):
        from helpers import extract_passengers
        extracted = extract_passengers(req.text)
        if extracted and extracted > 0:
            existing_session = get_wizard_session(req.session_id) if req.session_id else None
            existing_passengers = int(existing_session.get("passengers", 0)) if existing_session else 0
            if not existing_passengers:
                update_db_session(req.session_id, passengers=extracted)
                logger.info(f"Extracted passengers={extracted} from '{req.text}'")
                params["passengers"] = extracted
                if result.get("intent") in ("unknown", "help"):
                    result["intent"] = "confirm_booking"

# ── CONFIDENCE GATE — escape hatch ──────────────────────
    confidence = float(params.get("confidence", 1.0))
    
    # If confidence is below 85% on a single utterance, escalate immediately
    # This is the "API Parsing Confidence" trigger described in the design spec
    if confidence < 0.85:
        sid = req.session_id or ""
        logger.warning(f"Low confidence {confidence:.2f} (< 0.85) — escalating to CS")
        ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
        user_name = "Guest"
        session_data = get_wizard_session(sid) if sid else None
        if session_data and session_data.get("passenger_name"):
            user_name = session_data["passenger_name"]
        create_cs_ticket(ticket_id, session_id=sid, user_name=user_name,
                         issue=f"AI parsing confidence {confidence:.2f} below 0.85 threshold")
        return VoiceCommandResponse(
            intent="cs_escalation",
            parameters={"confidence": confidence, "reason": "low_confidence",
                         "original_text": req.text, "ticket_id": ticket_id,
                         "last_agent_message_id": 0},
            response_text=(
                f"I understood you with only {int(confidence * 100)}% confidence, "
                "which is below my safety threshold. "
                f"Your ticket ID is {ticket_id}. "
                "Let me connect you to a customer service agent who can help."
            ),
        )
    
    # Also run the 3-cycle retry tracker for unclear speech/ambient noise
    in_collection_mode = False
    low_conf_count = 0
    if req.session_id:
        session = get_wizard_session(req.session_id)
        if session:
            if session.get("current_step") == "collecting_fields":
                in_collection_mode = True
            low_conf_count = int(session.get("low_confidence_count", 0))

    if confidence < 0.8:
        low_conf_count += 1
        if req.session_id:
            update_db_session(req.session_id, low_confidence_count=low_conf_count)
    else:
        low_conf_count = 0
        if req.session_id:
            update_db_session(req.session_id, low_confidence_count=0)

    if not in_collection_mode and low_conf_count >= 3:
        logger.warning("3 consecutive low-confidence cycles — escalating to CS")
        sid = req.session_id or ""
        ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
        user_name = "Guest"
        session_data = get_wizard_session(sid) if sid else None
        if session_data and session_data.get("passenger_name"):
            user_name = session_data["passenger_name"]
        create_cs_ticket(ticket_id, session_id=sid, user_name=user_name, issue="AI low confidence — 3 consecutive cycles")
        return VoiceCommandResponse(
            intent="cs_escalation",
            parameters={"confidence": confidence, "low_confidence_count": low_conf_count,
                         "original_text": req.text, "ticket_id": ticket_id,
                         "last_agent_message_id": 0},
            response_text=(
                "I'm still having trouble understanding you clearly. "
                f"Your ticket ID is {ticket_id}. "
                "Let me connect you to a customer service agent. "
                "You can check for agent messages by saying 'check my messages'."
            ),
        )

    logger.info(f"Parsed command: intent={intent}, confidence={confidence}, params={params}")

    # 3. Booking info collector — save fields, check completeness
    if req.session_id and (intent in ("search_flights", "provide_name", "unknown") or in_collection_mode):
        session = get_wizard_session(req.session_id)
        if session and session.get("current_step") == "collecting_fields":
            save_extracted_fields(req.session_id, params)
            sid = req.session_id
            missing = get_missing_booking_fields(sid)

            if not missing:
                process_step(sid, "collecting_fields", {"collected": "true"})
                session_data = get_wizard_session(sid)
                search_params = {
                    "origin": session_data.get("origin", ""),
                    "destination": session_data.get("destination", ""),
                    "date": session_data.get("departure_date", ""),
                    "passengers": session_data.get("passengers", 1),
                    "max_price": session_data.get("max_price", 0),
                    "user_lang": params.get("user_lang", ""),
                    "passenger_name": session_data.get("passenger_name", ""),
                }
                return await handle_search_flights(search_params, "", sid)

            next_field = missing[0]
            field_questions = {
                "origin": "Where would you like to fly from?",
                "destination": "And where would you like to go?",
                "departure_date": "What date would you like to travel?",
                "passenger_name": "What is the passenger's full name?",
                "max_price": "Do you have a maximum budget for this trip?",
            }
            question = field_questions.get(next_field, f"Could you please tell me your {next_field}?")
            logger.info(f"Booking collector: missing {missing}, asking: {next_field}")
            return VoiceCommandResponse(
                intent="collect_booking_info",
                parameters={"missing_fields": missing, "next_field": next_field},
                response_text=question,
            )

    # 3b. EMERGENCY OVERRIDE — detect crisis keywords and escalate immediately
    emergency_keywords = [
        "emergency", "missed my connection", "missed my flight", "missed connection",
        "i'm stranded", "i am stranded", "stranded", "urgent", "help me",
        "i'm stuck", "i am stuck", "missed the flight", "missed my plane",
    ]
    user_text_lower = req.text.lower().strip()
    is_emergency = any(kw in user_text_lower for kw in emergency_keywords)
    if is_emergency:
        sid = req.session_id or ""
        ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
        user_name = "Guest"
        session_data = get_wizard_session(sid) if sid else None
        if session_data and session_data.get("passenger_name"):
            user_name = session_data["passenger_name"]
        create_cs_ticket(ticket_id, session_id=sid, user_name=user_name,
                         issue=f"EMERGENCY OVERRIDE: user said '{req.text[:100]}'")
        logger.warning(f"EMERGENCY OVERRIDE triggered: {req.text[:100]!r} → ticket {ticket_id}")
        return VoiceCommandResponse(
            intent="cs_escalation",
            parameters={"reason": "emergency", "ticket_id": ticket_id,
                         "session_id": sid},
            response_text=(
                "I understand this is urgent. I'm connecting you to a human "
                "customer service agent right now who can help with your situation. "
                f"Your emergency ticket ID is {ticket_id}. "
                "An agent will be with you shortly."
            ),
        )

    # 4. Route to the appropriate handler
    try:
        if intent == "search_flights":
            resp = await handle_search_flights(params, response_text, req.session_id)
        elif intent == "book_flight":
            resp = VoiceCommandResponse(
                intent="help", parameters=params,
                response_text="Try saying 'search flights from New York to London' to get started.",
            )
        elif intent == "cancel_booking":
            if needs_cs_escalation(intent, params, req.session_id):
                logger.info("Booking rejection detected — routing to CS")
                resp = VoiceCommandResponse(
                    intent="cs_escalation",
                    parameters={"reason": "booking_rejection", "session_id": req.session_id or ""},
                    response_text="I understand you'd like to stop. Let me connect you to a customer service agent who can help. Please hold the line.",
                )
            else:
                resp = await handle_cancel_booking(params, response_text)
        elif intent == "reschedule_booking":
            resp = await handle_reschedule_booking(params, response_text)
        elif intent == "view_history":
            resp = await handle_view_history(params, response_text)
        elif intent == "view_portfolio":
            resp = await handle_view_portfolio(params, response_text)
        elif intent == "search_with_budget":
            resp = await handle_search_with_budget(params, response_text, req.session_id)
        elif intent == "select_flight":
            resp = await handle_select_flight(params, response_text, req.session_id)
        elif intent == "provide_name":
            resp = await handle_provide_name(params, response_text, req.session_id)
        elif intent == "confirm_booking":
            resp = await handle_confirm_booking(params, response_text, req.session_id)
        elif intent == "help":
            # Check if we're mid-booking — offer to continue or escalate
            if req.session_id:
                session_data = get_wizard_session(req.session_id)
                if session_data:
                    step = session_data.get("current_step", "")
                    if step in ("passenger", "confirmation", "collecting_fields"):
                        missing = get_missing_booking_fields(req.session_id)
                        if missing and "passenger_name" in missing:
                            # User tried to say name but AI didn't understand — retry with escalation
                            increment_retry(req.session_id)
                            esc = check_retry_escalation(req.session_id)
                            if esc:
                                resp = esc
                            else:
                                resp = VoiceCommandResponse(
                                    intent="collect_booking_info",
                                    parameters={"missing_fields": missing, "next_field": "passenger_name"},
                                    response_text="I didn't catch your name clearly. Could you please say your full name again?",
                                )
                        else:
                            # Other mid-booking help — offer escalation
                            ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
                            user_name = session_data.get("passenger_name", "Guest")
                            create_cs_ticket(ticket_id, session_id=req.session_id, user_name=user_name,
                                             issue="User asked for help during booking flow")
                            resp = VoiceCommandResponse(
                                intent="cs_escalation",
                                parameters={"reason": "booking_help_request", "ticket_id": ticket_id,
                                             "session_id": req.session_id, "last_agent_message_id": 0},
                                response_text=(
                                    "It looks like you're having trouble with your booking. "
                                    "Let me connect you to a customer service agent. "
                                    "You can check for messages by saying 'check my messages'. "
                                ),
                            )
                    else:
                        resp = VoiceCommandResponse(
                            intent="help", parameters=params,
                            response_text=(
                                "I can help you search for flights, book a trip, "
                                "cancel or reschedule an existing booking, or check your flight history. "
                                "Just tell me what you need!"
                            ),
                        )
                else:
                    resp = VoiceCommandResponse(
                        intent="help", parameters=params,
                        response_text=(
                            "I can help you search for flights, book a trip, "
                            "cancel or reschedule an existing booking, or check your flight history. "
                            "Just tell me what you need!"
                        ),
                    )
            else:
                resp = VoiceCommandResponse(
                    intent="help", parameters=params,
                    response_text=(
                        "I can help you search for flights, book a trip, "
                        "cancel or reschedule an existing booking, or check your flight history. "
                        "Just tell me what you need!"
                    ),
                )
        elif intent == "cs_escalation":
            sid = req.session_id or ""
            ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
            user_name = "Guest"
            if sid:
                session = get_wizard_session(sid)
                if session and session.get("passenger_name"):
                    user_name = session["passenger_name"]
            create_cs_ticket(ticket_id, session_id=sid, user_name=user_name, issue="User requested human agent")
            resp = VoiceCommandResponse(
                intent="cs_escalation",
                parameters={"reason": "user_requested", "ticket_id": ticket_id, "session_id": sid,
                             "last_agent_message_id": 0},
                response_text=(
                    "Let me connect you to a customer service agent right away. "
                    "Your ticket ID is " + ticket_id + ". "
                    "You can check for agent messages anytime by saying 'check my messages'."
                ),
            )
        elif intent == "check_cs_messages":
            resp = await handle_check_cs_messages(params, req.session_id)
        else:
            resp = VoiceCommandResponse(
                intent="help", parameters={"unknown_intent": intent},
                response_text="I'm not sure how to help with that. Try saying 'book a flight' or 'show my trips'.",
            )

        # ── UNIVERSAL RETRY TRACKING ──────────────────────────────
        # After ANY step: if the response indicates a retry/error (system didn't
        # understand user), increment universal counter. After 3 → CS escalation.
        # If user made progress, reset counter.
        if req.session_id and resp:
            response_lower = resp.response_text.lower() if resp.response_text else ""
            is_retry = any(kw in response_lower for kw in [
                "didn't catch", "didn't understand", "try again",
                "booking failed", "something went wrong",
                "having trouble understanding",
                "not sure how to help",
            ])
            # Also treat generic help intent (not cs_escalation) as retry
            if resp.intent == "help" and not resp.parameters.get("ticket_id"):
                is_retry = True
            # Also treat confirm_booking with error text as retry
            if resp.intent == "confirm_booking" and "failed" in response_lower:
                is_retry = True

            if is_retry:
                increment_retry(req.session_id)
                esc = check_retry_escalation(req.session_id)
                if esc:
                    return esc
            else:
                reset_retry(req.session_id)

        return resp

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return VoiceCommandResponse(
            intent=intent, parameters=params,
            response_text=f"Sorry, something went wrong: {str(e)}",
        )


# ── TEXT-TO-SPEECH ────────────────────────────────────────────────


@router.get("/speak")
async def voice_speak(text: str = Query(..., description="Text to convert to speech")):
    """Convert text to speech audio file."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    try:
        audio_path = await voice.text_to_speech(text)
        if not audio_path:
            raise HTTPException(status_code=503, detail="Text-to-speech engine unavailable")
        return FileResponse(
            path=audio_path,
            media_type="audio/mpeg",
            filename=f"wayfinder_speech_{uuid.uuid4().hex[:8]}.mp3",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


# ── CS ESCALATION (mock) ─────────────────────────────────────────


@router.post("/cs-escalate")
async def cs_escalate(session_id: str = "", issue: str = ""):
    """Escalate to a mock customer service agent."""
    logger.info(f"CS escalation triggered: session={session_id}, issue={issue}")
    ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
    user_name = "Guest"
    if session_id:
        session = get_wizard_session(session_id)
        if session and session.get("passenger_name"):
            user_name = session["passenger_name"]
    ticket = create_cs_ticket(ticket_id, session_id=session_id, user_name=user_name,
                              issue=issue or "Voice assistant escalation")
    return {
        "status": "escalated", "ticket_id": ticket_id, "session_id": session_id,
        "message": "A customer service agent has been notified. They will be with you shortly.",
        "mock_phone": "+1-555-WAYFINDER", "estimated_wait": "2-3 minutes",
    }


# ── SPEECH-TO-TEXT ────────────────────────────────────────────────



async def handle_check_cs_messages(params: dict, session_id: str | None) -> VoiceCommandResponse:
    """Check if the CS agent has sent any messages for the user."""
    sid = session_id or params.get("session_id", "")
    last_msg_id = int(params.get("last_agent_message_id", 0))

    if not sid:
        return VoiceCommandResponse(
            intent="check_cs_messages", parameters=params,
            response_text="I need your session ID to check for messages.",
        )

    ticket = get_cs_ticket_by_session(sid)
    if not ticket:
        return VoiceCommandResponse(
            intent="check_cs_messages", parameters=params,
            response_text="You don't have an active support ticket. Say 'talk to an agent' to create one.",
        )

    msgs = get_user_agent_messages(ticket["id"], since_id=last_msg_id)
    if not msgs:
        return VoiceCommandResponse(
            intent="check_cs_messages",
            parameters={"last_agent_message_id": last_msg_id},
            response_text="No new messages from the agent yet. I'll keep checking for you.",
        )

    latest_id = max(m["id"] for m in msgs)
    agent_responses = [m["message"] for m in msgs if m["message"]]
    if agent_responses:
        speech = "You have messages from the agent. " + " ".join(agent_responses)
    else:
        speech = "You have new messages from customer support."

    return VoiceCommandResponse(
        intent="check_cs_messages",
        parameters={"last_agent_message_id": latest_id, "ticket_status": ticket["status"], "ticket_id": ticket["id"]},
        response_text=speech,
    )


# --- SPEECH-TO-TEXT ---

@router.post("/listen")
async def voice_listen(audio: UploadFile = File(...)):
    """Convert uploaded audio file to text."""
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    audio_dir = Path("/tmp/wayfinder_audio")
    audio_dir.mkdir(parents=True, exist_ok=True)
    temp_path = audio_dir / f"upload_{uuid.uuid4().hex[:12]}_{audio.filename}"

    try:
        content = await audio.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        transcript = await voice.speech_to_text(str(temp_path))
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try again or type your command.")
        return {"transcript": transcript, "filename": audio.filename, "length": len(content)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
    finally:
        try:
            if temp_path.exists():
                temp_path.unlink()
        except Exception:
            pass