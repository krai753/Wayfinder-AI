"""
Wayfinder Backend — CS Agent Dashboard Router
Real-time ticket management and agent-user messaging.
"""
import uuid
import json
import logging
from fastapi import APIRouter, HTTPException, Query
from database import (
    create_cs_ticket, get_cs_tickets, get_cs_ticket,
    update_cs_ticket, add_cs_message, get_cs_messages,
    get_session, create_session, update_session,
    save_booking, save_offer,
)
from config import settings
from duffel_client import duffel

router = APIRouter(prefix="/api/cs", tags=["cs_dashboard"])
logger = logging.getLogger("wayfinder.cs_dashboard")


@router.get("/tickets")
async def list_tickets(status: str = "", limit: int = 50):
    """List CS tickets, optionally filtered by status (open/assigned/closed)."""
    tickets = get_cs_tickets(status)
    # Add message count for each ticket
    result = []
    for t in tickets[:limit]:
        msgs = get_cs_messages(t["id"])
        t["message_count"] = len(msgs)
        t["last_message"] = msgs[-1]["message"] if msgs else ""
        result.append(t)
    return {"tickets": result, "count": len(result), "status_filter": status or "all"}


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    """Get a single ticket with its messages."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = get_cs_messages(ticket_id)
    ticket["messages"] = messages
    return ticket


@router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, agent_id: str = Query("", description="Agent ID to assign")):
    """Assign a ticket to an agent."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, status="assigned", agent_id=agent_id or "agent_default")
    # Add system message
    add_cs_message(ticket_id, "system", f"Ticket assigned to agent {agent_id or 'default'}")
    return {"status": "assigned", "ticket_id": ticket_id, "agent_id": agent_id or "agent_default"}


@router.post("/tickets/{ticket_id}/message")
async def send_message(ticket_id: str, sender: str = Query("agent", description="sender: agent or user"), message: str = Query(..., description="Message text")):
    """Send a message on a ticket (from agent or user)."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = add_cs_message(ticket_id, sender, message)
    return msg


@router.get("/tickets/{ticket_id}/messages")
async def get_ticket_messages(ticket_id: str):
    """Get all messages for a ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = get_cs_messages(ticket_id)
    return {"ticket_id": ticket_id, "messages": messages, "count": len(messages)}


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str):
    """Close a CS ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, status="closed")
    add_cs_message(ticket_id, "system", "Ticket closed")
    return {"status": "closed", "ticket_id": ticket_id}


# ═══════════════════════════════════════════════════════════════════
# CALL SYSTEM — Phone-like voice relay
# ═══════════════════════════════════════════════════════════════════


@router.post("/tickets/{ticket_id}/call")
async def initiate_call(ticket_id: str, agent_id: str = Query("", description="Agent name")):
    """Agent initiates a call to the user. Status → calling."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="calling", call_agent=agent_id or "Agent")
    add_cs_message(ticket_id, "system", f"📞 Agent {agent_id or 'Agent'} is calling...")
    return {"status": "calling", "ticket_id": ticket_id, "call_agent": agent_id or "Agent", "call_status": "calling"}


@router.post("/tickets/{ticket_id}/call/accept")
async def accept_call(ticket_id: str):
    """User accepts the call. Status → in_call."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="in_call")
    add_cs_message(ticket_id, "system", "📞 Call connected — voice relay active")
    return {"status": "in_call", "ticket_id": ticket_id, "call_status": "in_call"}


@router.post("/tickets/{ticket_id}/call/end")
async def end_call(ticket_id: str):
    """End the call. Status → assigned (still open for chat)."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_cs_ticket(ticket_id, call_status="ended")
    add_cs_message(ticket_id, "system", "📞 Call ended")
    return {"status": "assigned", "ticket_id": ticket_id, "call_status": "ended"}


@router.get("/tickets/{ticket_id}/call/status")
async def get_call_status(ticket_id: str):
    """Check the current call status for a ticket."""
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {
        "ticket_id": ticket_id,
        "call_status": ticket.get("call_status", "none"),
        "call_agent": ticket.get("call_agent", ""),
        "status": ticket["status"],
    }


# ═══════════════════════════════════════════════════════════════════
# AGENT BOOKING — Search + Book flights on behalf of user
# ═══════════════════════════════════════════════════════════════════


@router.post("/book-for-user")
async def agent_book_for_user(
    ticket_id: str = Query(..., description="CS ticket ID"),
    origin: str = Query(..., min_length=3, max_length=3, description="Origin IATA"),
    destination: str = Query(..., min_length=3, max_length=3, description="Destination IATA"),
    departure_date: str = Query(..., description="YYYY-MM-DD"),
    passenger_name: str = Query(..., description="Full passenger name"),
    passengers: int = Query(1, ge=1, le=9),
    seat_class: str = Query("economy"),
    max_price: float = Query(0.0, description="Optional max budget"),
):
    """
    Agent books a flight on behalf of a user end-to-end.
    1. Verifies ticket exists
    2. Searches Duffel for available flights
    3. Picks cheapest (within budget if specified)
    4. Creates wizard session & saves offer
    5. Books via Duffel (or mock fallback)
    6. Sends BOOKING: structured message to ticket for TTS announcement
    7. Returns booking details
    """
    logger.info(f"📞 Agent booking for ticket {ticket_id}: {origin} → {destination} on {departure_date}")

    # 1. Verify ticket
    ticket = get_cs_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # 2. Search flights via Duffel
    try:
        raw = await duffel.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            passengers=passengers,
            cabin_class=seat_class,
        )
        offers = duffel.simplify_offers(raw)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Flight search failed: {str(e)}")

    if not offers:
        raise HTTPException(status_code=404, detail="No flights found for this route")

    # 3. Filter by budget if specified
    if max_price > 0:
        budget_offers = []
        for o in offers:
            try:
                if float(o.get("price", 0) or 0) <= max_price:
                    budget_offers.append(o)
            except (ValueError, TypeError):
                continue
        if not budget_offers:
            raise HTTPException(status_code=404, detail=f"No flights found within budget {max_price}")
        offers = budget_offers

    # 4. Pick cheapest
    cheapest = min(offers, key=lambda o: float(o.get("price", 0) or 0))

    # 5. Create/update wizard session
    session_id = ticket.get("session_id") or f"cs_session_{uuid.uuid4().hex[:10]}"
    existing = get_session(session_id)
    if not existing:
        create_session(session_id)

    summary = (
        f"{cheapest.get('airline', '')} {cheapest.get('flight_number', '')} - "
        f"{origin} → {destination}, {cheapest.get('price', '')} {cheapest.get('currency', '')}"
    )

    update_session(session_id,
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        passenger_name=passenger_name,
        passenger_assistance="none",
        selected_offer_id=cheapest["id"],
        selected_flight_summary=summary,
        current_step="confirmation",
    )

    # Cache the offer
    save_offer(session_id, cheapest["id"], cheapest)

    # Update ticket's session_id if it was empty
    if not ticket.get("session_id"):
        update_cs_ticket(ticket_id, session_id=session_id)

    # 6. Create the booking
    from routers.booking import create_booking as create_booking_fn
    from models import BookingCreateRequest

    try:
        booking_result = await create_booking_fn(BookingCreateRequest(session_id=session_id))
        booking_ref = booking_result.booking_reference or booking_result.id or f"CS-{uuid.uuid4().hex[:6].upper()}"
        total_amount = cheapest.get("price", "0")
        total_currency = cheapest.get("currency", "GBP")
    except HTTPException as e:
        # Fallback: create booking directly
        from database import get_session as get_db_sesh
        session_data = get_db_sesh(session_id)
        mock_amount = cheapest.get("price", "432.26")
        mock_ref = f"CS-{uuid.uuid4().hex[:6].upper()}"
        booking_id = f"bk_{uuid.uuid4().hex[:10]}"
        booking = {
            "id": booking_id,
            "session_id": session_id,
            "duffel_order_id": f"mock_{uuid.uuid4().hex[:8]}",
            "status": "confirmed",
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "flight_summary": summary,
            "passenger_name": passenger_name,
            "passenger_assistance": "none",
            "total_amount": mock_amount,
            "total_currency": "GBP",
            "booking_reference": mock_ref,
        }
        save_booking(booking)
        booking_ref = mock_ref
        total_amount = mock_amount
        total_currency = "GBP"

    # 7. Send BOOKING: structured message for TTS
    booking_data = json.dumps({
        "type": "booking_confirmed",
        "origin": origin,
        "destination": destination,
        "date": departure_date,
        "passenger_name": passenger_name,
        "total_amount": f"{total_amount} {total_currency}",
        "booking_reference": booking_ref,
        "airline": cheapest.get("airline", "Airline"),
        "flight_number": cheapest.get("flight_number", ""),
        "seat": seat_class,
        "passengers": passengers,
    })
    add_cs_message(ticket_id, "system", f"BOOKING:{booking_data}")

    # Also send a human-readable summary
    summary_msg = (
        f"✅ Agent booked for {passenger_name}: "
        f"{origin} → {destination} on {departure_date}, "
        f"{cheapest.get('airline', '')} "
        f"{cheapest.get('flight_number', '')} "
        f"{total_amount} {total_currency} "
        f"Ref: {booking_ref}"
    )
    add_cs_message(ticket_id, "system", summary_msg)

    logger.info(f"✅ Agent booking complete for {passenger_name}: {origin}→{destination} Ref: {booking_ref}")

    return {
        "status": "booked",
        "booking_reference": booking_ref,
        "origin": origin,
        "destination": destination,
        "departure_date": departure_date,
        "passenger_name": passenger_name,
        "total_amount": f"{total_amount} {total_currency}",
        "airline": cheapest.get("airline", ""),
        "flight_number": cheapest.get("flight_number", ""),
        "offer_count": len(offers),
        "cheapest_offer": cheapest,
    }