"""
Wayfinder Backend — Voice Command Router
Unified voice interface: "Book New York to London next Tuesday"
"""
import json
import logging
import uuid
from datetime import datetime, date
from pathlib import Path
from fastapi import APIRouter, HTTPException, File, UploadFile, Query
from fastapi.responses import FileResponse
from models import VoiceCommandRequest, VoiceCommandResponse
from llm_orchestrator import llm
from llm_parser_ai import ai_parser
from voice_engine import voice
from duffel_client import duffel

# ── Translation helper for bilingual responses ──

def _translate_response(text: str, user_lang: str) -> str:
    """Translate response text to user's language if needed."""
    if not user_lang or user_lang == "en":
        return text
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="en", target=user_lang).translate(text)
    except Exception:
        return text
from airport_data import search_airports, get_airport
from database import create_session, get_bookings, get_bookings_by_user, get_portfolio_stats, get_session as get_db_session, save_booking, save_offer
from wizard_manager import create_wizard_session, get_wizard_session, process_step

router = APIRouter(prefix="/api/voice", tags=["voice"])
logger = logging.getLogger("wayfinder.voice_router")


# ── Helper: Resolve date phrases ──────────────────────────────────


def _resolve_date(phrase: str) -> str:
    """Convert natural language date phrases to YYYY-MM-DD."""
    today = date.today()
    lowered = phrase.strip().lower()

    if lowered == "today":
        return today.isoformat()
    if lowered == "tomorrow":
        from datetime import timedelta
        return (today + timedelta(days=1)).isoformat()
    if lowered == "day after tomorrow":
        from datetime import timedelta
        return (today + timedelta(days=2)).isoformat()

    # "next tuesday", "next monday" etc.
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }
    for day_name, day_idx in day_map.items():
        if f"next {day_name}" in lowered or f"this {day_name}" in lowered:
            days_ahead = day_idx - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            from datetime import timedelta
            return (today + timedelta(days=days_ahead)).isoformat()

    # Already a date-like string?
    try:
        from datetime import datetime as dt
        dt.strptime(phrase, "%Y-%m-%d")
        return phrase
    except ValueError:
        pass

    # Try "July 15th" style
    import re
    months = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
        "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    for month_name, month_num in months.items():
        pattern = rf"{month_name}\s+(\d{{1,2}})(?:st|nd|rd|th)?"
        m = re.search(pattern, lowered)
        if m:
            day = int(m.group(1))
            year = today.year
            # If the date has already passed this year, use next year
            test_date = date(year, month_num, day)
            if test_date < today:
                test_date = date(year + 1, month_num, day)
            return test_date.isoformat()

    return phrase  # Return as-is, LLM may have provided ISO format


# ── Helper: Resolve IATA from city names ──────────────────────────


def _resolve_iata(city_or_code: str) -> str:
    """Resolve a city name or partial code to an IATA code."""
    code = city_or_code.strip().upper()
    # If it's already a 3-letter IATA code, validate it
    if len(code) == 3 and get_airport(code):
        return code

    # Fuzzy search airports
    results = search_airports(city_or_code, limit=5)
    if results:
        # Prefer major airports (ranked by search_airports scoring)
        return results[0]["iata"]

    return code  # Return original if nothing found


# ── Booking Info Collector ──────────────────────────────────────
# Collects required booking fields step by step via voice:
#   name, origin, destination, departure_date, max_price (optional)


def _save_extracted_fields(session_id: str, params: dict):
    """Save any booking fields extracted by the AI parser into the wizard session."""
    field_map = {
        "origin": "origin",
        "destination": "destination",
        "date": "departure_date",
        "name": "passenger_name",
        "max_price": "max_price",
        "passengers": "passengers",
    }
    for param_key, session_key in field_map.items():
        value = params.get(param_key)
        if value and str(value).strip():
            # Check if already saved to avoid overwriting with empty
            existing = get_wizard_session(session_id) if session_id else None
            if existing:
                existing_val = existing.get(session_key)
                if existing_val:
                    continue  # Don't overwrite existing values
            process_step(session_id, session_key, {session_key: value})
            logger.info(f"Booking collector: saved {session_key} = {value}")

    # Mark session as in collecting mode
    session = get_wizard_session(session_id)
    if session and session.get("current_step") not in ("collecting_fields", "flight_selection", "passenger", "confirmation", "completed"):
        process_step(session_id, "current_step", {"current_step": "collecting_fields"})


def _get_missing_booking_fields(session_id: str) -> list:
    """Check which required booking fields are still missing from the session."""
    session = get_wizard_session(session_id)
    if not session:
        return ["origin", "destination", "departure_date", "passenger_name"]

    missing = []

    # Required fields for booking
    if not session.get("origin"):
        missing.append("origin")
    if not session.get("destination"):
        missing.append("destination")
    if not session.get("departure_date"):
        missing.append("departure_date")
    if not session.get("passenger_name"):
        missing.append("passenger_name")

    logger.info(f"Booking collector: session {session_id} missing fields: {missing}")
    return missing


# ── MAIN VOICE COMMAND ────────────────────────────────────────────


@router.post("/command", response_model=VoiceCommandResponse)
async def voice_command(req: VoiceCommandRequest):
    """
    Process a voice/natural language command.
    Accepts text like "Book a flight from New York to London next Tuesday under $400"
    Returns structured response with intent, parameters, and spoken response text.

    The LLM parses the intent, then this router executes the appropriate action
    and returns results formatted for TTS playback.
    """
    # 1. Get session context if session_id provided
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

# 2. AI parses the command (try LLM first, fall back to rule-based)
    try:
        # Try the AI parser (DeepSeek/OpenRouter) first
        ai_result = await ai_parser.parse(req.text, context)
        if ai_result:
            result = ai_result
            logger.info(f"AI parser → intent={result['intent']}")
        else:
            # Fall back to rule-based parser
            result = await llm.parse_command(req.text, context)
            logger.info(f"Rule-based parser → intent={result['intent']}")
    except Exception as e:
        logger.error(f"LLM parse failed: {e}")
        return VoiceCommandResponse(
            intent="help",
            parameters={"error": str(e)},
            response_text="Sorry, I had trouble understanding that. Could you please rephrase?",
        )

    intent = result.get("intent", "help")
    params = result.get("parameters", {})
    response_text = result.get("response_text", "")

    # ── CONFIDENCE GATE — track across 3 consecutive cycles ────
    confidence = float(params.get("confidence", 1.0))
    in_collection_mode = False
    low_conf_count = 0
    if req.session_id:
        session = get_wizard_session(req.session_id)
        if session:
            if session.get("current_step") == "collecting_fields":
                in_collection_mode = True
            low_conf_count = int(session.get("low_confidence_count", 0))

    # Update confidence tracker
    if confidence < 0.75:
        low_conf_count += 1
        if req.session_id:
            process_step(req.session_id, "low_confidence_count", {"low_confidence_count": low_conf_count})
    else:
        low_conf_count = 0
        if req.session_id:
            process_step(req.session_id, "low_confidence_count", {"low_confidence_count": 0})

    # Escalate if 3 consecutive low-confidence cycles
    if not in_collection_mode and low_conf_count >= 3:
        logger.warning(f"3 consecutive low-confidence cycles — escalating to CS")
        return VoiceCommandResponse(
            intent="cs_escalation",
            parameters={"confidence": confidence, "low_confidence_count": low_conf_count, "original_text": req.text},
            response_text=(
                "I'm having trouble understanding you clearly. "
                "Let me connect you to a customer service agent who can assist you directly. "
                "Please hold the line."
            ),
        )

    logger.info(f"Parsed command: intent={intent}, confidence={confidence}, params={params}")

    # 3. Booking info collector — if we're collecting fields, save & check
    if req.session_id and (intent in ("search_flights", "provide_name", "unknown") or in_collection_mode):
        session = get_wizard_session(req.session_id)
        if session and session.get("current_step") == "collecting_fields":
            # We're in booking info collection mode — save what we got
            _save_extracted_fields(req.session_id, params)
            sid = req.session_id
            missing = _get_missing_booking_fields(sid)

            if not missing:
                # All fields collected! Search flights
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
                return await _handle_search_flights(search_params, "", sid)

            # Ask for the next missing field
            field_questions = {
                "origin": "Where would you like to fly from?",
                "destination": "And where would you like to go?",
                "departure_date": "What date would you like to travel?",
                "passenger_name": "What is the passenger's full name?",
                "max_price": "Do you have a maximum budget for this trip?",
            }
            next_field = missing[0]
            question = field_questions.get(next_field, f"Could you please tell me your {next_field}?")
            logger.info(f"Booking collector: missing {missing}, asking: {next_field}")
            return VoiceCommandResponse(
                intent="collect_booking_info",
                parameters={"missing_fields": missing, "next_field": next_field},
                response_text=question,
            )

    # 4. Execute the appropriate action
    try:
        if intent == "search_flights":
            return await _handle_search_flights(params, response_text, req.session_id)

        elif intent == "book_flight":
            # Dead intent — LLM never returns this. Route to help instead.
            return VoiceCommandResponse(
                intent="help",
                parameters=params,
                response_text="Try saying 'search flights from New York to London' to get started.",
            )

        elif intent == "cancel_booking":
            # Check if in-booking rejection → CS escalation
            if _needs_cs_escalation(intent, params, req.session_id):
                logger.info(f"Booking rejection detected — routing to CS")
                return VoiceCommandResponse(
                    intent="cs_escalation",
                    parameters={"reason": "booking_rejection", "session_id": req.session_id or ""},
                    response_text="I understand you'd like to stop. Let me connect you to a customer service agent who can help. Please hold the line.",
                )
            return await _handle_cancel_booking(params, response_text)

        elif intent == "reschedule_booking":
            return await _handle_reschedule_booking(params, response_text)

        elif intent == "view_history":
            return await _handle_view_history(params, response_text)

        elif intent == "view_portfolio":
            return await _handle_view_portfolio(params, response_text)

        elif intent == "search_with_budget":
            return await _handle_search_with_budget(params, response_text, req.session_id)

        elif intent == "select_flight":
            return await _handle_select_flight(params, response_text, req.session_id)

        elif intent == "provide_name":
            return await _handle_provide_name(params, response_text, req.session_id)

        elif intent == "confirm_booking":
            return await _handle_confirm_booking(params, response_text, req.session_id)

        elif intent == "help":
            return VoiceCommandResponse(
                intent="help",
                parameters=params,
                response_text= (
                    "I can help you search for flights, book a trip, "
                    "cancel or reschedule an existing booking, or check your flight history. "
                    "Just tell me what you need!"
                ),
            )

        elif intent == "cs_escalation":
            # Create a CS ticket and route
            from database import create_cs_ticket
            sid = req.session_id or ""
            ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
            user_name = "Guest"
            if sid:
                session = get_wizard_session(sid)
                if session and session.get("passenger_name"):
                    user_name = session["passenger_name"]
            create_cs_ticket(ticket_id, session_id=sid, user_name=user_name, issue="User requested human agent")
            return VoiceCommandResponse(
                intent="cs_escalation",
                parameters={"reason": "user_requested", "ticket_id": ticket_id, "session_id": sid},
                response_text= "Let me connect you to a customer service agent right away. Please hold the line.",
            )

        else:
            return VoiceCommandResponse(
                intent="help",
                parameters={"unknown_intent": intent},
                response_text="I'm not sure how to help with that. Try saying 'book a flight' or 'show my trips'.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return VoiceCommandResponse(
            intent=intent,
            parameters=params,
            response_text=f"Sorry, something went wrong: {str(e)}",
        )


# ── Rejection → CS escalation ────────────────────────────────


def _needs_cs_escalation(intent: str, params: dict, session_id: str | None) -> bool:
    """Check if user rejected the booking and needs CS escalation."""
    # User said no/cancel during confirmation or booking flow
    if intent in ("cancel_booking", "help") and session_id:
        session = get_wizard_session(session_id)
        if session:
            step = session.get("current_step", "")
            if step in ("confirmation", "flight_selection", "passenger", "collecting_fields"):
                return True
    return False


# ── Intent Handlers ───────────────────────────────────────────────


async def _handle_search_flights(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Search for flights and return results."""
    origin = _resolve_iata(params.get("origin", ""))
    destination = _resolve_iata(params.get("destination", ""))
    dep_date = _resolve_date(params.get("date", ""))
    passengers = params.get("passengers", 1)

    user_lang = params.get("user_lang", "")

    if not origin or not destination or not dep_date:
        return VoiceCommandResponse(
            intent="search_flights",
            parameters=params,
            response_text=_translate_response("I need an origin, destination, and date to search for flights.", user_lang),
        )

    # Ensure we have valid airports
    if not get_airport(origin):
        return VoiceCommandResponse(
            intent="search_flights",
            parameters=params,
            response_text=_translate_response(f"Sorry, I could not find the airport for {origin}. Could you try a different city?", user_lang),
        )
    if not get_airport(destination):
        return VoiceCommandResponse(
            intent="search_flights",
            parameters=params,
            response_text=_translate_response(f"Sorry, I could not find the airport for {destination}. Could you try a different city?", user_lang),
        )

    raw = await duffel.search_flights(
        origin=origin,
        destination=destination,
        departure_date=dep_date,
        passengers=passengers,
    )
    offers = duffel.simplify_offers(raw)

    # Create or use session for caching
    sid = session_id
    if not sid:
        session_data = create_wizard_session()
        sid = session_data["id"]

    # Cache offers
    for offer in offers:
        save_offer(sid, offer["id"], offer)

    # Build response
    if not offers:
        # ── ALTERNATE DATE QUERY — try +/- 3 days ──────────
        from datetime import timedelta
        alt_results = []
        try:
            base = datetime.strptime(dep_date, "%Y-%m-%d").date()
            for delta in [-3, -2, -1, 1, 2, 3]:
                alt_date = (base + timedelta(days=delta)).isoformat()
                try:
                    alt_raw = await duffel.search_flights(
                        origin=origin, destination=destination,
                        departure_date=alt_date, passengers=passengers,
                    )
                    alt_offers = duffel.simplify_offers(alt_raw)
                    if alt_offers:
                        alt_results.append({"date": alt_date, "offers": alt_offers[:3]})
                except Exception:
                    continue
        except Exception:
            pass

        if alt_results:
            closest = min(alt_results, key=lambda r: abs((datetime.strptime(r["date"], "%Y-%m-%d").date() - base).days))
            cheapest_alt = min(closest["offers"], key=lambda o: float(o.get("price", 0) or 0))
            speech = (
                f"No flights found on {dep_date}, but I found {len(closest['offers'])} flights "
                f"on {closest['date']}. The cheapest is {cheapest_alt['airline']} "
                f"at {cheapest_alt['price']} {cheapest_alt['currency']}. "
                f"Would that date work?"
            )
            offers = closest["offers"]
            # Cache alt offers
            for offer in offers:
                save_offer(sid, offer["id"], offer)
        else:
            speech = f"No flights found from {origin} to {destination} on {dep_date} or nearby dates."
    else:
        cheapest = min(offers, key=lambda o: float(o.get("price", 0) or 0))
        speech = (
            f"I found {len(offers)} flights from {origin} to {destination} on {dep_date}. "
            f"The cheapest is {cheapest['airline']} flight {cheapest['flight_number']} "
            f"at {cheapest['price']} {cheapest['currency']}."
        )

    return VoiceCommandResponse(
        intent="search_flights",
        parameters={
            "origin": origin,
            "destination": destination,
            "date": dep_date,
            "passengers": passengers,
            "offer_count": len(offers),
            "offers": offers[:5],  # Top 5 for frontend display
            "session_id": sid,
            "cheapest_offer": cheapest if offers else None,
        },
        response_text= speech,
    )


async def _handle_cancel_booking(params: dict, response_text: str) -> VoiceCommandResponse:
    """Cancel a booking."""
    booking_id = params.get("booking_id", "")

    if not booking_id:
        # Try to find the most recent booking for the user
        user_id = params.get("user_id")
        if user_id:
            bookings = get_bookings_by_user(user_id)
            if bookings:
                booking_id = bookings[0]["id"]

    if not booking_id:
        return VoiceCommandResponse(
            intent="cancel_booking",
            parameters=params,
            response_text="I need a booking reference to cancel. You can find it in your flight history.",
        )

    # Initiate cancellation (step 1)
    try:
        from routers.manage import cancel_booking as cancel_action
        cancel_data = await cancel_action(booking_id)

        speech = (
            f"I've initiated a cancellation for booking {booking_id}. "
            f"A refund of {cancel_data['refund_amount']} {cancel_data['refund_currency']} is available. "
            f"Shall I confirm the cancellation?"
        )

        return VoiceCommandResponse(
            intent="cancel_booking",
            parameters={
                "booking_id": booking_id,
                "cancellation_id": cancel_data["cancellation_id"],
                "refund_amount": cancel_data["refund_amount"],
                "refund_currency": cancel_data["refund_currency"],
                "status": cancel_data["status"],
            },
            response_text= speech,
        )

    except HTTPException as e:
        return VoiceCommandResponse(
            intent="cancel_booking",
            parameters={"booking_id": booking_id},
            response_text=f"Could not cancel booking: {e.detail}",
        )


async def _handle_reschedule_booking(params: dict, response_text: str) -> VoiceCommandResponse:
    """Reschedule a booking to a new date."""
    booking_id = params.get("booking_id", "")
    new_date = _resolve_date(params.get("new_date", ""))

    if not booking_id:
        user_id = params.get("user_id")
        if user_id:
            bookings = get_bookings_by_user(user_id)
            if bookings:
                booking_id = bookings[0]["id"]

    if not booking_id:
        return VoiceCommandResponse(
            intent="reschedule_booking",
            parameters=params,
            response_text="I need a booking reference to reschedule.",
        )

    if not new_date:
        return VoiceCommandResponse(
            intent="reschedule_booking",
            parameters={"booking_id": booking_id},
            response_text="What date would you like to move your flight to?",
        )

    # Search for reschedule options
    from routers.manage import reschedule_search as rs_search

    try:
        search_result = await rs_search(booking_id, new_date)
        offers = search_result.get("change_offers", [])

        if not offers:
            speech = f"No reschedule options available for booking {booking_id} on {new_date}."
        else:
            cheapest = min(offers, key=lambda o: float(o.get("change_total", 0) or 0))
            speech = (
                f"I found {len(offers)} reschedule options for {new_date}. "
                f"The cheapest option is {cheapest['airline']} at "
                f"{cheapest['change_total']} {cheapest['currency']} total change fee."
            )

        return VoiceCommandResponse(
            intent="reschedule_booking",
            parameters={
                "booking_id": booking_id,
                "new_date": new_date,
                "change_offers": offers,
                "offer_count": len(offers),
            },
            response_text= speech,
        )

    except HTTPException as e:
        return VoiceCommandResponse(
            intent="reschedule_booking",
            parameters={"booking_id": booking_id, "new_date": new_date},
            response_text=f"Reschedule search failed: {e.detail}",
        )


async def _handle_view_history(params: dict, response_text: str) -> VoiceCommandResponse:
    """View flight history for a user. Works with or without user_id."""
    user_id = params.get("user_id", "")

    if not user_id:
        # No user_id — fetch all bookings instead
        bookings = get_bookings(limit=20)
        if not bookings:
            return VoiceCommandResponse(
                intent="view_history",
                parameters=params,
                response_text="You don't have any flights yet. Say 'book a flight' to get started!",
            )
        total = len(bookings)
        upcoming = sum(1 for b in bookings if b.get("status") == "confirmed" and b.get("departure_date", "") >= date.today().isoformat())
        speech = (
            f"You have {total} trips in your history. "
            f"{upcoming} of them are upcoming. "
            f"Your most recent trip was from {bookings[0].get('origin', '')} to {bookings[0].get('destination', '')}."
        )
        return VoiceCommandResponse(
            intent="view_history",
            parameters={
                "user_id": "all",
                "total_trips": total,
                "bookings": bookings[:10],
            },
            response_text= speech,
        )

    bookings = get_bookings_by_user(user_id)

    if not bookings:
        speech = "You don't have any flights yet. Say 'book a flight' to get started!"
    else:
        total = len(bookings)
        upcoming = sum(1 for b in bookings if b.get("status") == "confirmed" and b.get("departure_date", "") >= date.today().isoformat())
        speech = (
            f"You have {total} trips in your history. "
            f"{upcoming} of them are upcoming. "
            f"Your most recent trip was from {bookings[0].get('origin', '')} to {bookings[0].get('destination', '')}."
        )

    return VoiceCommandResponse(
        intent="view_history",
        parameters={
            "user_id": user_id,
            "total_trips": len(bookings),
            "bookings": bookings[:10],  # Last 10
        },
        response_text= speech,
    )


async def _handle_view_portfolio(params: dict, response_text: str) -> VoiceCommandResponse:
    """View flight portfolio statistics. Works with or without user_id."""
    user_id = params.get("user_id", "")

    if not user_id:
        # No user_id — calculate from all bookings
        all_bookings = get_bookings(limit=1000)
        total = len(all_bookings)
        spent = sum(float(b.get("total_amount", 0) or 0) for b in all_bookings)
        cancelled = sum(1 for b in all_bookings if b.get("status") == "cancelled")
        upcoming = [b for b in all_bookings if b.get("status") == "confirmed" and b.get("departure_date", "") >= date.today().isoformat()]

        # Favourite route
        routes = {}
        for b in all_bookings:
            route = f"{b.get('origin', '?')} → {b.get('destination', '?')}"
            routes[route] = routes.get(route, 0) + 1
        fav_route = max(routes, key=routes.get) if routes else "None yet"

        speech = (
            f"You've taken {total} trips, spending a total of "
            f"£{spent:.2f}. "
            f"Your favourite route is {fav_route}. "
            f"You have {len(upcoming)} upcoming trips."
        )
        return VoiceCommandResponse(
            intent="view_portfolio",
            parameters={
                "user_id": "all",
                "total_trips": total,
                "total_spent": spent,
                "favorite_route": fav_route,
                "upcoming_trips": upcoming,
                "cancelled_count": cancelled,
            },
            response_text= speech,
        )

    stats = get_portfolio_stats(user_id)

    speech = (
        f"You've taken {stats['total_bookings']} trips, spending a total of "
        f"£{stats['total_spent']}. "
        f"Your favourite route is {stats['favorite_route']}. "
        f"You have {len(stats['upcoming_trips'])} upcoming trips."
    )

    return VoiceCommandResponse(
        intent="view_portfolio",
        parameters={
            "user_id": user_id,
            "total_trips": stats["total_bookings"],
            "total_spent": stats["total_spent"],
            "favorite_route": stats["favorite_route"],
            "upcoming_trips": stats["upcoming_trips"],
            "cancelled_count": stats["cancelled_count"],
        },
        response_text= speech,
    )


async def _handle_search_with_budget(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Search flights within a budget."""
    origin = _resolve_iata(params.get("origin", ""))
    destination = _resolve_iata(params.get("destination", ""))
    dep_date = _resolve_date(params.get("date", ""))
    max_price = params.get("max_price", 0)
    passengers = params.get("passengers", 1)
    user_lang = params.get("user_lang", "")

    if not origin or not destination or not dep_date or not max_price:
        return VoiceCommandResponse(
            intent="search_with_budget",
            parameters=params,
            response_text=_translate_response("I need an origin, destination, date, and maximum price to search within a budget.", user_lang),
        )

    # Validate
    if not get_airport(origin):
        return VoiceCommandResponse(
            intent="search_with_budget",
            parameters=params,
            response_text=_translate_response(f"Sorry, I could not find the airport for {origin}.", user_lang),
        )
    if not get_airport(destination):
        return VoiceCommandResponse(
            intent="search_with_budget",
            parameters=params,
            response_text=_translate_response(f"Sorry, I could not find the airport for {destination}.", user_lang),
        )

    raw = await duffel.search_flights(
        origin=origin,
        destination=destination,
        departure_date=dep_date,
        passengers=passengers,
    )
    offers = duffel.simplify_offers(raw)

    # Filter by budget
    budget_offers = []
    for offer in offers:
        try:
            price = float(offer["price"])
            if price <= float(max_price):
                budget_offers.append(offer)
        except (ValueError, TypeError):
            continue

    # Cache offers
    sid = session_id
    if not sid:
        session_data = create_wizard_session()
        sid = session_data["id"]
    for offer in budget_offers:
        save_offer(sid, offer["id"], offer)

    if not budget_offers:
        speech = f"No flights found from {origin} to {destination} on {dep_date} within your budget of {max_price}."
    else:
        cheapest = min(budget_offers, key=lambda o: float(o.get("price", 0) or 0))
        speech = (
            f"I found {len(budget_offers)} flights under {max_price} from {origin} to {destination} "
            f"on {dep_date}. The cheapest is {cheapest['airline']} at "
            f"{cheapest['price']} {cheapest['currency']}."
        )

    return VoiceCommandResponse(
        intent="search_with_budget",
        parameters={
            "origin": origin,
            "destination": destination,
            "date": dep_date,
            "max_price": max_price,
            "passengers": passengers,
            "offer_count": len(budget_offers),
            "offers": budget_offers[:5],
            "session_id": sid,
        },
        response_text= speech,
    )


# ── TEXT-TO-SPEECH ────────────────────────────────────────────────


@router.get("/speak")
async def voice_speak(text: str = Query(..., description="Text to convert to speech")):
    """
    Convert text to speech audio file.
    Returns an MP3 audio file of the spoken text.
    """
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
    """
    Escalate to a mock customer service agent.
    Creates a CS ticket in the database.
    In production, this would route to Twilio/Vonage to call a CS agent.
    """
    logger.info(f"CS escalation triggered: session={session_id}, issue={issue}")
    from database import create_cs_ticket
    ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
    # Get user name from session if available
    user_name = "Guest"
    if session_id:
        session = get_wizard_session(session_id)
        if session and session.get("passenger_name"):
            user_name = session["passenger_name"]
    ticket = create_cs_ticket(ticket_id, session_id=session_id, user_name=user_name, issue=issue or "Voice assistant escalation")
    return {
        "status": "escalated",
        "ticket_id": ticket_id,
        "session_id": session_id,
        "message": "A customer service agent has been notified. They will be with you shortly.",
        "mock_phone": "+1-555-WAYFINDER",
        "estimated_wait": "2-3 minutes",
    }


# ── SPEECH-TO-TEXT ────────────────────────────────────────────────


@router.post("/listen")
async def voice_listen(audio: UploadFile = File(...)):
    """
    Convert uploaded audio file to text.
    Accepts WAV, MP3, FLAC, etc. Returns the transcribed text.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Save uploaded file temporarily
    audio_dir = Path("/tmp/wayfinder_audio")
    audio_dir.mkdir(parents=True, exist_ok=True)
    temp_path = audio_dir / f"upload_{uuid.uuid4().hex[:12]}_{audio.filename}"

    try:
        content = await audio.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        # Process with speech-to-text engine
        transcript = await voice.speech_to_text(str(temp_path))

        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try again or type your command.")

        return {
            "transcript": transcript,
            "filename": audio.filename,
            "length": len(content),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
    finally:
        # Clean up temp file
        try:
            if temp_path.exists():
                temp_path.unlink()
        except Exception:
            pass

# ═══════════════════════════════════════════════════════════════════
# CONTINUOUS VOICE FLOW — Multi-turn booking handlers
# These enable an end-to-end voice-only conversation where the user
# never leaves the VoiceScreen.
# ═══════════════════════════════════════════════════════════════════


async def _handle_select_flight(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """
    Handle "select the first/cheapest/second flight" voice command.
    Resolves position (first, cheapest, "3") to an actual offer from cached results.
    """
    position = params.get("position", "cheapest")
    user_lang = params.get("user_lang", "")

    # Get the session
    sid = session_id or params.get("session_id", "")
    if not sid:
        return VoiceCommandResponse(
            intent="select_flight",
            parameters=params,
            response_text=_translate_response("I need to search for flights first. Try saying 'book a flight from New York to London'.", user_lang),
        )

    # Get cached offers for this session
    cached = get_offers(sid)
    offers = []
    for co in cached:
        od = co.get("offer_data", {})
        if isinstance(od, dict) and od.get("id"):
            offers.append(od)

    if not offers:
        return VoiceCommandResponse(
            intent="select_flight",
            parameters=params,
            response_text=_translate_response("I don't have any flight results cached. Please search for flights again.", user_lang),
        )

    # Resolve position to an offer
    selected_offer = None
    if position == "cheapest":
        selected_offer = min(offers, key=lambda o: float(o.get("price", 0) or 0))
    elif position == "first":
        selected_offer = offers[0]
    elif position == "second":
        selected_offer = offers[1] if len(offers) > 1 else None
    elif position == "third":
        selected_offer = offers[2] if len(offers) > 2 else None
    elif position == "fourth":
        selected_offer = offers[3] if len(offers) > 3 else None
    elif position == "fifth":
        selected_offer = offers[4] if len(offers) > 4 else None
    else:
        # Try numeric position
        try:
            idx = int(position) - 1
            if 0 <= idx < len(offers):
                selected_offer = offers[idx]
        except (ValueError, IndexError):
            selected_offer = offers[0]

    if not selected_offer:
        return VoiceCommandResponse(
            intent="select_flight",
            parameters=params,
            response_text=_translate_response("I couldn't find that flight option. Try saying 'first' or 'cheapest'.", user_lang),
        )

    offer_id = selected_offer["id"]
    summary = (
        f"{selected_offer.get('airline', '')} {selected_offer.get('flight_number', '')} - "
        f"{selected_offer.get('origin', '')} to {selected_offer.get('destination', '')}, "
        f"{selected_offer.get('price', '')} {selected_offer.get('currency', '')}"
    )

    # Save offer selection in wizard session
    process_step(sid, "flight_selection", {
        "offer_id": offer_id,
        "flight_summary": summary,
    })

    speech = (
        f"Great choice! {summary}. "
        f"What is the passenger's full name?"
    )

    return VoiceCommandResponse(
        intent="select_flight",
        parameters={
            "session_id": sid,
            "offer_id": offer_id,
            "selected_flight_summary": summary,
            "next_step": "passenger",
            "user_lang": user_lang,
        },
        response_text= _translate_response(speech, user_lang),
    )


async def _handle_provide_name(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """
    Handle user providing their passenger name.
    Saves name in wizard session, then asks if they have assistance needs.
    """
    name = params.get("name", "").strip()
    user_lang = params.get("user_lang", "")
    sid = session_id or params.get("session_id", "")

    if not name:
        return VoiceCommandResponse(
            intent="provide_name",
            parameters=params,
            response_text=_translate_response("I didn't catch your name. Could you please say it again?", user_lang),
        )

    if sid:
        # Save passenger name in wizard (this advances to assistance step)
        process_step(sid, "passenger", {"name": name})

        # Auto-accept "no assistance" and move to confirmation
        process_step(sid, "assistance", {"assistance": "none"})

        session_data = get_db_session(sid)
        flight_summary = (session_data or {}).get("selected_flight_summary", "")

        speech = (
            f"Thanks, {name}! Ready to book {flight_summary}. "
            f"Shall I confirm the booking?"
        )
    else:
        speech = f"Thanks, {name}! Let me look up your booking session."

    return VoiceCommandResponse(
        intent="provide_name",
        parameters={
            "session_id": sid,
            "passenger_name": name,
            "next_step": "assistance",
            "user_lang": user_lang,
        },
        response_text= _translate_response(speech, user_lang),
    )


async def _handle_confirm_booking(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """
    Handle user confirming the booking.
    Calls create_booking to book via Duffel (or mock fallback).
    """
    user_lang = params.get("user_lang", "")
    sid = session_id or params.get("session_id", "")

    if not sid:
        return VoiceCommandResponse(
            intent="confirm_booking",
            parameters=params,
            response_text=_translate_response("I don't have an active booking session. Let's start over - say 'book a flight'.", user_lang),
        )

    # Save assistance default if not set
    from database import get_session as get_db_sesh
    session_data = get_db_sesh(sid)
    if session_data and not session_data.get("passenger_assistance"):
        process_step(sid, "assistance", {"assistance": "none"})

    # Save confirmation in wizard
    process_step(sid, "confirmation", {"confirmed": True})

    # Create the booking
    from routers.booking import create_booking
    from models import BookingCreateRequest

    try:
        booking_result = await create_booking(BookingCreateRequest(session_id=sid))

        speech = (
            f"Your flight is booked! "
            f"Reference: {booking_result.booking_reference}. "
            f"{booking_result.origin} to {booking_result.destination} "
            f"on {booking_result.departure_date}. "
            f"Total: {booking_result.total_amount}. "
            f"Thank you for using Wayfinder!"
        )

        return VoiceCommandResponse(
            intent="confirm_booking",
            parameters={
                "session_id": sid,
                "booking_id": booking_result.id,
                "booking_reference": booking_result.booking_reference,
                "origin": booking_result.origin,
                "destination": booking_result.destination,
                "departure_date": booking_result.departure_date,
                "total_amount": booking_result.total_amount,
                "passenger_name": booking_result.passenger_name,
                "booking_complete": True,
                "user_lang": user_lang,
            },
            response_text= _translate_response(speech, user_lang),
        )

    except HTTPException as e:
        return VoiceCommandResponse(
            intent="confirm_booking",
            parameters=params,
            response_text=_translate_response(f"Booking failed: {e.detail}. Please try again.", user_lang),
        )
