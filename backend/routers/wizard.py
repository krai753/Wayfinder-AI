"""
Wayfinder Backend — Wizard Router
State machine for the accessible voice-first booking flow
"""

from fastapi import APIRouter, HTTPException
from models import (
    CreateSessionRequest,
    WizardStepRequest,
    SessionResponse,
    SelectFlightRequest,
    PassengerDetailsRequest,
)
from wizard_manager import (
    create_wizard_session,
    get_wizard_session,
    process_step,
)
from airport_data import get_airport
from duffel_client import duffel
from database import save_offer, get_offers

router = APIRouter(prefix="/api", tags=["wizard"])


@router.post("/wizard/session")
async def start_session(req: CreateSessionRequest = CreateSessionRequest()):
    """Create a new booking wizard session."""
    session = create_wizard_session(req.session_id)
    return {
        "session_id": session["id"],
        "current_step": session["current_step"],
        "message": "Where would you like to fly from?",
        "available_steps": [
            "origin", "destination", "departure_date",
            "flight_selection", "passenger", "assistance", "confirmation"
        ],
    }


@router.get("/wizard/session/{session_id}")
async def get_session_state(session_id: str):
    """Get the current state of a wizard session."""
    session = get_wizard_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/wizard/step")
async def wizard_step(req: WizardStepRequest):
    """Advance the wizard by submitting step data."""
    result = process_step(req.session_id, req.step.value, req.data)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Build a helpful response message based on the new step
    current_step = result.get("current_step", "")
    hints = _get_step_hints(result, current_step)
    return {
        "session_id": req.session_id,
        "current_step": current_step,
        **hints,
    }


@router.post("/wizard/flights/search")
async def wizard_search_flights(session_id: str):
    """
    Search for flights using the data already stored in the wizard session,
    then cache the offers.
    """
    session = get_wizard_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    origin = session.get("origin")
    destination = session.get("destination")
    departure_date = session.get("departure_date")

    if not all([origin, destination, departure_date]):
        raise HTTPException(
            status_code=400,
            detail="Need origin, destination, and departure date before searching flights",
        )

    try:
        raw = await duffel.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
        )

        offers = duffel.simplify_offers(raw)

        # Cache offers in database
        for offer in offers:
            save_offer(session_id, offer["id"], offer)

        return {
            "session_id": session_id,
            "offer_count": len(offers),
            "offers": offers,
        }

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Flight search failed: {str(e)}")


@router.post("/wizard/flights/select")
async def wizard_select_flight(req: SelectFlightRequest):
    """Select a flight offer and advance the wizard."""
    session = get_wizard_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get offer details for the summary
    cached = get_offers(req.session_id)
    selected = None
    for off in cached:
        if off["id"] == req.offer_id or off.get("offer_data", {}).get("id") == req.offer_id:
            selected = off.get("offer_data", {})
            break

    flight_summary = ""
    if selected:
        flight_summary = (
            f"{selected.get('airline', '')} {selected.get('flight_number', '')} — "
            f"{selected.get('origin', '')} → {selected.get('destination', '')}, "
            f"{selected.get('departure_time', '')[:16].replace('T', ' ')}, "
            f"{selected.get('price', '')} {selected.get('currency', '')}"
        )

    result = process_step(req.session_id, "flight_selection", {
        "offer_id": req.offer_id,
        "flight_summary": flight_summary,
    })

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        "session_id": req.session_id,
        "current_step": result.get("current_step"),
        "selected_flight": flight_summary,
        "message": "What is the passenger's name?",
    }


@router.post("/wizard/passenger")
async def wizard_passenger(req: PassengerDetailsRequest):
    """Submit passenger details and advance the wizard."""
    # Step 1: Save passenger name
    result = process_step(req.session_id, "passenger", {"name": req.name})
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Step 2: Ask about assistance
    result2 = process_step(req.session_id, "assistance", {"assistance": req.assistance})
    if "error" in result2:
        raise HTTPException(status_code=400, detail=result2["error"])

    # Step 3: Move to confirmation
    result3 = process_step(req.session_id, "confirmation", {"confirmed": True})
    if "error" in result3:
        raise HTTPException(status_code=400, detail=result3["error"])

    return {
        "session_id": req.session_id,
        "current_step": result3.get("current_step"),
        "passenger_name": req.name,
        "assistance": req.assistance,
        "message": "Booking confirmed! Your flight is ready.",
    }


def _get_step_hints(session: dict, step: str) -> dict:
    """Generate helpful hints based on the current wizard step."""
    hints = {"message": "", "available_options": []}

    if step == "origin":
        hints["message"] = "Where would you like to fly from? Say a city name or type an airport code."
    elif step == "destination":
        hints["message"] = "Where would you like to go?"
        hints["origin"] = session.get("origin")
        hints["origin_name"] = session.get("origin_name")
    elif step == "departure_date":
        hints["message"] = "When would you like to depart?"
        hints["origin"] = session.get("origin")
        hints["destination"] = session.get("destination")
    elif step == "flight_selection":
        hints["message"] = "Select a flight from the available options."
        hints["origin"] = session.get("origin")
        hints["destination"] = session.get("destination")
    elif step == "passenger":
        hints["message"] = "What is the passenger's name?"
    elif step == "assistance":
        hints["message"] = "Do you require special assistance?"
        hints["available_options"] = ["wheelchair", "visual", "none"]
    elif step == "confirmation":
        hints["message"] = "Please confirm your booking."
        hints["summary"] = {
            "origin": session.get("origin_name") or session.get("origin"),
            "destination": session.get("destination_name") or session.get("destination"),
            "date": session.get("departure_date"),
            "flight": session.get("selected_flight_summary"),
            "passenger": session.get("passenger_name"),
        }
    elif step == "completed":
        hints["message"] = "Your booking is complete! Thank you for using Wayfinder."

    return hints