"""
Wayfinder Backend — Voice Action Handlers
Intent handlers for the voice command pipeline.
Extracted from routers/voice.py for cleaner architecture.
"""

import json
import logging
import uuid
from datetime import datetime, date, timedelta

from models import VoiceCommandResponse
from helpers import resolve_date, resolve_iata, translate_text
from voice_engine import voice
from duffel_client import duffel
from airport_data import get_airport
from database import (
    get_session, get_bookings, get_bookings_by_user, get_portfolio_stats,
    get_offers as get_cached_offers, save_offer, save_booking,
    update_session as update_db_session, create_cs_ticket,
)
from wizard_manager import create_wizard_session, get_wizard_session, process_step

logger = logging.getLogger("wayfinder.voice_actions")

RETRY_THRESHOLD = 5

# ═══════════════════════════════════════════════════════════════════
# RETRY TRACKING
# ═══════════════════════════════════════════════════════════════════


def increment_retry(session_id: str) -> int:
    """Increment retry counter for a session. Returns current count."""
    session = get_session(session_id)
    count = int(session.get("retry_count", 0)) if session else 0
    count += 1
    update_db_session(session_id, retry_count=count)
    logger.info(f"Retry {count}/{RETRY_THRESHOLD} for session {session_id}")
    return count


def reset_retry(session_id: str):
    """Reset retry counter after valid input."""
    update_db_session(session_id, retry_count=0)


def check_retry_escalation(session_id: str, user_lang: str = "") -> VoiceCommandResponse | None:
    """Check if retry count exceeded threshold and return escalation if so."""
    session = get_session(session_id)
    count = int(session.get("retry_count", 0)) if session else 0
    if count < RETRY_THRESHOLD:
        return None

    reset_retry(session_id)
    ticket_id = f"TKT{uuid.uuid4().hex[:8].upper()}"
    user_name = "Guest"
    if session and session.get("passenger_name"):
        user_name = session["passenger_name"]
    create_cs_ticket(ticket_id, session_id=session_id, user_name=user_name,
                     issue="User struggling — repeated invalid input")

    response = translate_text(
        "I'm having trouble understanding your input. Would you like me to connect you "
        "to a customer service agent who can assist you directly? Please say yes or no.",
        user_lang,
    )
    return VoiceCommandResponse(
        intent="cs_escalation",
        parameters={"reason": "retry_exceeded", "ticket_id": ticket_id,
                     "session_id": session_id, "confirm_needed": True},
        response_text=response,
    )


# ═══════════════════════════════════════════════════════════════════
# BOOKING INFO COLLECTOR
# ═══════════════════════════════════════════════════════════════════

FIELD_QUESTIONS = {
    "origin": "Where would you like to fly from?",
    "destination": "And where would you like to go?",
    "departure_date": "What date would you like to travel?",
    "passenger_name": "What is the passenger's full name?",
    "max_price": "Do you have a maximum budget for this trip?",
    "passengers": "How many passengers will be traveling?",
}

FIELD_MAP = {
    "origin": "origin",
    "destination": "destination",
    "date": "departure_date",
    "name": "passenger_name",
    "max_price": "max_price",
    "passengers": "passengers",
}


def save_extracted_fields(session_id: str, params: dict):
    """Save any booking fields extracted by the AI parser into the wizard session."""
    for param_key, session_key in FIELD_MAP.items():
        value = params.get(param_key)
        if value and str(value).strip():
            existing = get_wizard_session(session_id) if session_id else None
            if existing:
                existing_val = existing.get(session_key)
                if existing_val:
                    continue
            update_db_session(session_id, **{session_key: value})
            logger.info(f"Booking collector: saved {session_key} = {value}")

    session = get_wizard_session(session_id)
    if session and session.get("current_step") not in (
        "collecting_fields", "flight_selection", "passenger", "confirmation", "completed"
    ):
        update_db_session(session_id, current_step="collecting_fields")


def get_missing_booking_fields(session_id: str) -> list:
    """Check which required booking fields are still missing from the session."""
    session = get_wizard_session(session_id)
    if not session:
        return ["origin", "destination", "departure_date", "passenger_name"]

    missing = []
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


def needs_cs_escalation(intent: str, params: dict, session_id: str | None) -> bool:
    """Check if user rejected the booking and needs CS escalation."""
    if intent in ("cancel_booking", "help") and session_id:
        session = get_wizard_session(session_id)
        if session:
            step = session.get("current_step", "")
            if step in ("confirmation", "flight_selection", "passenger", "collecting_fields"):
                return True
    return False


# ═══════════════════════════════════════════════════════════════════
# INTENT HANDLERS
# ═══════════════════════════════════════════════════════════════════


async def handle_search_flights(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Search for flights and return results."""
    origin = resolve_iata(params.get("origin", ""))
    destination = resolve_iata(params.get("destination", ""))
    dep_date = resolve_date(params.get("date", ""))
    passengers = params.get("passengers", 1)
    user_lang = params.get("user_lang", "")

    if not origin or not destination or not dep_date:
        sid = session_id
        if not sid:
            session_data = create_wizard_session()
            sid = session_data["id"]

        if origin:
            process_step(sid, "origin", {"origin": origin})
        if destination:
            process_step(sid, "destination", {"destination": destination})
        if dep_date:
            process_step(sid, "departure_date", {"departure_date": dep_date})
        update_db_session(sid, current_step="collecting_fields")

        missing = get_missing_booking_fields(sid)
        if not missing:
            missing = ["origin", "destination", "departure_date"]
        next_field = missing[0]
        question = FIELD_QUESTIONS.get(next_field, f"Could you please tell me your {next_field}?")

        return VoiceCommandResponse(
            intent="collect_booking_info",
            parameters={"missing_fields": missing, "next_field": next_field,
                        "session_id": sid, "user_lang": user_lang},
            response_text=translate_text(question, user_lang),
        )

    # Validate airports
    sid_for_retry = session_id or ""
    if not get_airport(origin):
        if sid_for_retry:
            increment_retry(sid_for_retry)
            esc = check_retry_escalation(sid_for_retry, user_lang)
            if esc:
                return esc
        return VoiceCommandResponse(
            intent="search_flights", parameters=params,
            response_text=translate_text(f"Sorry, I could not find the airport for {origin}. Could you try a different city?", user_lang),
        )
    if not get_airport(destination):
        if sid_for_retry:
            increment_retry(sid_for_retry)
            esc = check_retry_escalation(sid_for_retry, user_lang)
            if esc:
                return esc
        return VoiceCommandResponse(
            intent="search_flights", parameters=params,
            response_text=translate_text(f"Sorry, I could not find the airport for {destination}. Could you try a different city?", user_lang),
        )

    sid = session_id
    if not sid:
        session_data = create_wizard_session()
        sid = session_data["id"]

    reset_retry(sid)

    raw = await duffel.search_flights(
        origin=origin, destination=destination,
        departure_date=dep_date, passengers=passengers,
    )
    offers = duffel.simplify_offers(raw)

    for offer in offers:
        save_offer(sid, offer["id"], offer)

    if not offers:
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
            closest = min(alt_results, key=lambda r: abs(
                (datetime.strptime(r["date"], "%Y-%m-%d").date() - base).days))
            cheapest_alt = min(closest["offers"], key=lambda o: float(o.get("price", 0) or 0))
            speech = (
                f"No flights found on {dep_date}, but I found {len(closest['offers'])} flights "
                f"on {closest['date']}. The cheapest is {cheapest_alt['airline']} "
                f"at {cheapest_alt['price']} {cheapest_alt['currency']}. "
                f"Would that date work for you?"
            )
            offers = closest["offers"]
            for offer in offers:
                save_offer(sid, offer["id"], offer)
        else:
            speech = f"No flights found from {origin} to {destination} on {dep_date} or nearby dates."
    else:
        cheapest = min(offers, key=lambda o: float(o.get("price", 0) or 0))
        speech = (
            f"I found {len(offers)} flights from {origin} to {destination} on {dep_date}. "
            f"The cheapest is {cheapest['airline']} flight {cheapest['flight_number']} "
            f"at {cheapest['price']} {cheapest['currency']}. "
            f"Would you like to book the cheapest flight? Just say yes to continue."
        )

    return VoiceCommandResponse(
        intent="search_flights",
        parameters={
            "origin": origin, "destination": destination, "date": dep_date,
            "passengers": passengers, "offer_count": len(offers),
            "offers": offers[:5], "session_id": sid,
            "cheapest_offer": cheapest if offers else None,
        },
        response_text=speech,
    )


async def handle_cancel_booking(params: dict, response_text: str) -> VoiceCommandResponse:
    """Cancel a booking."""
    booking_id = params.get("booking_id", "")
    if not booking_id:
        user_id = params.get("user_id")
        if user_id:
            bookings = get_bookings_by_user(user_id)
            if bookings:
                booking_id = bookings[0]["id"]
    if not booking_id:
        return VoiceCommandResponse(
            intent="cancel_booking", parameters=params,
            response_text="I need a booking reference to cancel. You can find it in your flight history.",
        )

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
            response_text=speech,
        )
    except Exception as e:
        return VoiceCommandResponse(
            intent="cancel_booking", parameters={"booking_id": booking_id},
            response_text=f"Could not cancel booking: {str(e)}",
        )


async def handle_reschedule_booking(params: dict, response_text: str) -> VoiceCommandResponse:
    """Reschedule a booking to a new date."""
    booking_id = params.get("booking_id", "")
    new_date = resolve_date(params.get("new_date", ""))
    if not booking_id:
        user_id = params.get("user_id")
        if user_id:
            bookings = get_bookings_by_user(user_id)
            if bookings:
                booking_id = bookings[0]["id"]
    if not booking_id:
        return VoiceCommandResponse(
            intent="reschedule_booking", parameters=params,
            response_text="I need a booking reference to reschedule.",
        )
    if not new_date:
        return VoiceCommandResponse(
            intent="reschedule_booking", parameters={"booking_id": booking_id},
            response_text="What date would you like to move your flight to?",
        )

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
            parameters={"booking_id": booking_id, "new_date": new_date,
                        "change_offers": offers, "offer_count": len(offers)},
            response_text=speech,
        )
    except Exception as e:
        return VoiceCommandResponse(
            intent="reschedule_booking", parameters={"booking_id": booking_id, "new_date": new_date},
            response_text=f"Reschedule search failed: {str(e)}",
        )


async def handle_view_history(params: dict, response_text: str) -> VoiceCommandResponse:
    """View flight history for a user."""
    user_id = params.get("user_id", "")
    if not user_id:
        bookings = get_bookings(limit=20)
        if not bookings:
            return VoiceCommandResponse(
                intent="view_history", parameters=params,
                response_text="You don't have any flights yet. Say 'book a flight' to get started!",
            )
        total = len(bookings)
        upcoming = sum(1 for b in bookings if b.get("status") == "confirmed"
                       and b.get("departure_date", "") >= date.today().isoformat())
        speech = (
            f"You have {total} trips in your history. {upcoming} of them are upcoming. "
            f"Your most recent trip was from {bookings[0].get('origin', '')} "
            f"to {bookings[0].get('destination', '')}."
        )
        return VoiceCommandResponse(
            intent="view_history",
            parameters={"user_id": "all", "total_trips": total, "bookings": bookings[:10]},
            response_text=speech,
        )

    bookings = get_bookings_by_user(user_id)
    if not bookings:
        speech = "You don't have any flights yet. Say 'book a flight' to get started!"
    else:
        total = len(bookings)
        upcoming = sum(1 for b in bookings if b.get("status") == "confirmed"
                       and b.get("departure_date", "") >= date.today().isoformat())
        speech = (
            f"You have {total} trips in your history. {upcoming} of them are upcoming. "
            f"Your most recent trip was from {bookings[0].get('origin', '')} "
            f"to {bookings[0].get('destination', '')}."
        )
    return VoiceCommandResponse(
        intent="view_history",
        parameters={"user_id": user_id, "total_trips": len(bookings), "bookings": bookings[:10]},
        response_text=speech,
    )


async def handle_view_portfolio(params: dict, response_text: str) -> VoiceCommandResponse:
    """View flight portfolio statistics."""
    user_id = params.get("user_id", "")
    if not user_id:
        all_bookings = get_bookings(limit=1000)
        total = len(all_bookings)
        spent = sum(float(b.get("total_amount", 0) or 0) for b in all_bookings)
        cancelled = sum(1 for b in all_bookings if b.get("status") == "cancelled")
        upcoming = [b for b in all_bookings if b.get("status") == "confirmed"
                    and b.get("departure_date", "") >= date.today().isoformat()]
        routes = {}
        for b in all_bookings:
            route = f"{b.get('origin', '?')} → {b.get('destination', '?')}"
            routes[route] = routes.get(route, 0) + 1
        fav_route = max(routes, key=routes.get) if routes else "None yet"
        speech = (
            f"You've taken {total} trips, spending a total of £{spent:.2f}. "
            f"Your favourite route is {fav_route}. You have {len(upcoming)} upcoming trips."
        )
        return VoiceCommandResponse(
            intent="view_portfolio",
            parameters={"user_id": "all", "total_trips": total, "total_spent": spent,
                        "favorite_route": fav_route, "upcoming_trips": upcoming,
                        "cancelled_count": cancelled},
            response_text=speech,
        )

    stats = get_portfolio_stats(user_id)
    speech = (
        f"You've taken {stats['total_bookings']} trips, spending a total of £{stats['total_spent']}. "
        f"Your favourite route is {stats['favorite_route']}. "
        f"You have {len(stats['upcoming_trips'])} upcoming trips."
    )
    return VoiceCommandResponse(
        intent="view_portfolio",
        parameters={"user_id": user_id, "total_trips": stats["total_bookings"],
                    "total_spent": stats["total_spent"], "favorite_route": stats["favorite_route"],
                    "upcoming_trips": stats["upcoming_trips"], "cancelled_count": stats["cancelled_count"]},
        response_text=speech,
    )


async def handle_search_with_budget(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Search flights within a budget."""
    origin = resolve_iata(params.get("origin", ""))
    destination = resolve_iata(params.get("destination", ""))
    dep_date = resolve_date(params.get("date", ""))
    max_price = params.get("max_price", 0)
    passengers = params.get("passengers", 1)
    user_lang = params.get("user_lang", "")

    if not origin or not destination or not dep_date or not max_price:
        return VoiceCommandResponse(
            intent="search_with_budget", parameters=params,
            response_text=translate_text("I need an origin, destination, date, and maximum price to search within a budget.", user_lang),
        )
    if not get_airport(origin):
        return VoiceCommandResponse(
            intent="search_with_budget", parameters=params,
            response_text=translate_text(f"Sorry, I could not find the airport for {origin}.", user_lang),
        )
    if not get_airport(destination):
        return VoiceCommandResponse(
            intent="search_with_budget", parameters=params,
            response_text=translate_text(f"Sorry, I could not find the airport for {destination}.", user_lang),
        )

    raw = await duffel.search_flights(
        origin=origin, destination=destination,
        departure_date=dep_date, passengers=passengers,
    )
    offers = duffel.simplify_offers(raw)

    budget_offers = []
    for offer in offers:
        try:
            if float(offer["price"]) <= float(max_price):
                budget_offers.append(offer)
        except (ValueError, TypeError):
            continue

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
        parameters={"origin": origin, "destination": destination, "date": dep_date,
                    "max_price": max_price, "passengers": passengers,
                    "offer_count": len(budget_offers), "offers": budget_offers[:5],
                    "session_id": sid},
        response_text=speech,
    )


async def handle_select_flight(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Handle 'select the first/cheapest/second flight' voice command."""
    position = params.get("position", "cheapest")
    user_lang = params.get("user_lang", "")
    sid = session_id or params.get("session_id", "")

    if not sid:
        return VoiceCommandResponse(
            intent="select_flight", parameters=params,
            response_text=translate_text("I need to search for flights first. Try saying 'book a flight from New York to London'.", user_lang),
        )

    cached = get_cached_offers(sid)
    offers = []
    for co in cached:
        od = co.get("offer_data", {})
        if isinstance(od, dict) and od.get("id"):
            offers.append(od)

    if not offers:
        return VoiceCommandResponse(
            intent="select_flight", parameters=params,
            response_text=translate_text("I don't have any flight results cached. Please search for flights again.", user_lang),
        )

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
        try:
            idx = int(position) - 1
            if 0 <= idx < len(offers):
                selected_offer = offers[idx]
        except (ValueError, IndexError):
            selected_offer = offers[0]

    if not selected_offer:
        return VoiceCommandResponse(
            intent="select_flight", parameters=params,
            response_text=translate_text("I couldn't find that flight option. Try saying 'first' or 'cheapest'.", user_lang),
        )

    offer_id = selected_offer["id"]
    summary = (
        f"{selected_offer.get('airline', '')} {selected_offer.get('flight_number', '')} - "
        f"{selected_offer.get('origin', '')} to {selected_offer.get('destination', '')}, "
        f"{selected_offer.get('price', '')} {selected_offer.get('currency', '')}"
    )

    process_step(sid, "flight_selection", {"offer_id": offer_id, "flight_summary": summary})

    speech = f"Great choice! {summary}. What is the passenger's full name?"

    return VoiceCommandResponse(
        intent="select_flight",
        parameters={"session_id": sid, "offer_id": offer_id,
                    "selected_flight_summary": summary, "next_step": "passenger", "user_lang": user_lang},
        response_text=translate_text(speech, user_lang),
    )


async def handle_provide_name(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Handle user providing their passenger name."""
    name = params.get("name", "").strip()
    user_lang = params.get("user_lang", "")
    sid = session_id or params.get("session_id", "")

    if not name:
        if sid:
            increment_retry(sid)
            esc = check_retry_escalation(sid, user_lang)
            if esc:
                return esc
        return VoiceCommandResponse(
            intent="provide_name", parameters=params,
            response_text=translate_text("I didn't catch your name. Could you please say it again?", user_lang),
        )

    if sid:
        reset_retry(sid)
        process_step(sid, "passenger", {"name": name})

        session_data = get_session(sid)
        passengers = int(session_data.get("passengers", 0)) if session_data else 0
        if not passengers:
            speech = f"Thanks, {name}! How many passengers will be traveling?"
            return VoiceCommandResponse(
                intent="collect_booking_info",
                parameters={"missing_fields": ["passengers"], "next_field": "passengers",
                            "session_id": sid, "user_lang": user_lang},
                response_text=translate_text(speech, user_lang),
            )

        process_step(sid, "assistance", {"assistance": "none"})
        session_data = get_session(sid)
        flight_summary = (session_data or {}).get("selected_flight_summary", "")

        speech = f"Thanks, {name}! Ready to book {flight_summary}. Shall I confirm the booking?"
    else:
        speech = f"Thanks, {name}! Let me look up your booking session."

    return VoiceCommandResponse(
        intent="provide_name",
        parameters={"session_id": sid, "passenger_name": name,
                    "next_step": "assistance", "user_lang": user_lang},
        response_text=translate_text(speech, user_lang),
    )


async def handle_confirm_booking(params: dict, response_text: str, session_id: str | None) -> VoiceCommandResponse:
    """Handle user confirming the booking."""
    user_lang = params.get("user_lang", "")
    sid = session_id or params.get("session_id", "")

    if not sid:
        return VoiceCommandResponse(
            intent="confirm_booking", parameters=params,
            response_text=translate_text("I don't have an active booking session. Let's start over — say 'book a flight'.", user_lang),
        )

    session_data = get_session(sid)

    # Ensure selected_offer_id is set
    if not session_data or not session_data.get("selected_offer_id"):
        cached = get_cached_offers(sid)
        if cached:
            cheapest = min(cached, key=lambda co: float(co.get("offer_data", {}).get("price", 0) or 0))
            od = cheapest.get("offer_data", {})
            if isinstance(od, dict) and od.get("id"):
                offer_id = od["id"]
                summary = (
                    f"{od.get('airline', '')} {od.get('flight_number', '')} - "
                    f"{od.get('origin', '')} to {od.get('destination', '')}, "
                    f"{od.get('price', '')} {od.get('currency', '')}"
                )
                process_step(sid, "flight_selection", {"offer_id": offer_id, "flight_summary": summary})
                session_data = get_session(sid)

    passenger_name = session_data.get("passenger_name", "") if session_data else ""
    if not passenger_name:
        return VoiceCommandResponse(
            intent="collect_booking_info",
            parameters={"missing_fields": ["passenger_name"], "next_field": "passenger_name",
                        "session_id": sid, "user_lang": user_lang},
            response_text=translate_text("What is the passenger's full name?", user_lang),
        )

    passengers = int(session_data.get("passengers", 0)) if session_data else 0
    if not passengers:
        return VoiceCommandResponse(
            intent="collect_booking_info",
            parameters={"missing_fields": ["passengers"], "next_field": "passengers",
                        "session_id": sid, "user_lang": user_lang},
            response_text=translate_text("How many passengers will be traveling?", user_lang),
        )

    if session_data and not session_data.get("passenger_assistance"):
        process_step(sid, "assistance", {"assistance": "none"})
    process_step(sid, "confirmation", {"confirmed": True})

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
            parameters={"session_id": sid, "booking_id": booking_result.id,
                        "booking_reference": booking_result.booking_reference,
                        "origin": booking_result.origin, "destination": booking_result.destination,
                        "departure_date": booking_result.departure_date,
                        "total_amount": booking_result.total_amount,
                        "passenger_name": booking_result.passenger_name,
                        "booking_complete": True, "user_lang": user_lang},
            response_text=translate_text(speech, user_lang),
        )
    except Exception as e:
        return VoiceCommandResponse(
            intent="confirm_booking", parameters=params,
            response_text=translate_text(f"Booking failed: {str(e)}. Please try again.", user_lang),
        )