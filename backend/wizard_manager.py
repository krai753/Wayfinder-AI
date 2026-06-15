"""
Wayfinder Backend — Booking Wizard State Machine
Manages the 6-step accessible booking flow for voice/first interaction.
"""

from enum import Enum
import uuid
from typing import Optional
from database import get_session, create_session, update_session
from models import WizardStep


STEP_ORDER = [
    WizardStep.origin,
    WizardStep.destination,
    WizardStep.departure_date,
    WizardStep.flight_selection,
    WizardStep.passenger,
    WizardStep.assistance,
    WizardStep.confirmation,
    WizardStep.completed,
]


def _next_step(current: WizardStep) -> WizardStep | None:
    """Get the next step in the wizard flow."""
    try:
        idx = STEP_ORDER.index(current)
        if idx + 1 < len(STEP_ORDER):
            return STEP_ORDER[idx + 1]
    except ValueError:
        pass
    return None


def _prev_step(current: WizardStep) -> WizardStep | None:
    """Get the previous step in the wizard flow."""
    try:
        idx = STEP_ORDER.index(current)
        if idx - 1 >= 0:
            return STEP_ORDER[idx - 1]
    except ValueError:
        pass
    return None


def create_wizard_session(session_id: Optional[str] = None) -> dict:
    """Create a new wizard session."""
    if not session_id:
        session_id = f"wizard_{uuid.uuid4().hex[:12]}"
    return create_session(session_id)


def get_wizard_session(session_id: str) -> dict | None:
    """Get the current state of a wizard session."""
    return get_session(session_id)


def process_step(session_id: str, step: str, data: dict) -> dict:
    """
    Process a wizard step and advance the state machine.
    Returns the updated session with hints for the next interaction.
    """
    session = get_session(session_id)
    if not session:
        return {"error": "Session not found", "session_id": session_id}

    current = WizardStep(step)
    updates = {}

    # Validate and store step data
    if current == WizardStep.origin:
        origin_iata = data.get("origin", "").upper().strip()
        origin_name = data.get("origin_name", "")
        if len(origin_iata) != 3:
            return {"error": "Invalid origin IATA code", "step": step}
        updates["origin"] = origin_iata
        updates["origin_name"] = origin_name

    elif current == WizardStep.destination:
        dest_iata = data.get("destination", "").upper().strip()
        dest_name = data.get("destination_name", "")
        if len(dest_iata) != 3:
            return {"error": "Invalid destination IATA code", "step": step}
        if dest_iata == session.get("origin"):
            return {"error": "Destination cannot be the same as origin", "step": step}
        updates["destination"] = dest_iata
        updates["destination_name"] = dest_name

    elif current == WizardStep.departure_date:
        date_str = data.get("departure_date", "")
        time_str = data.get("departure_time", "")
        if not date_str:
            return {"error": "Departure date is required", "step": step}
        updates["departure_date"] = date_str
        updates["departure_time"] = time_str

    elif current == WizardStep.flight_selection:
        offer_id = data.get("offer_id", "")
        flight_summary = data.get("flight_summary", "")
        if not offer_id:
            return {"error": "No flight selected", "step": step}
        updates["selected_offer_id"] = offer_id
        updates["selected_flight_summary"] = flight_summary

    elif current == WizardStep.passenger:
        name = data.get("name", "").strip()
        if not name:
            return {"error": "Passenger name is required", "step": step}
        updates["passenger_name"] = name

    elif current == WizardStep.assistance:
        assistance = data.get("assistance", "none")
        updates["passenger_assistance"] = assistance

    elif current == WizardStep.confirmation:
        confirmed = data.get("confirmed", False)
        if not confirmed:
            return {"error": "Booking not confirmed", "step": step}

    # Advance to next step
    next_step_val = _next_step(current)
    if next_step_val:
        updates["current_step"] = next_step_val.value
    else:
        updates["current_step"] = WizardStep.completed.value

    # Save to database
    update_session(session_id, **updates)

    # Return updated session
    return get_session(session_id) or {"error": "Failed to update session"}


def can_resume(session_id: str) -> bool:
    """Check if a session can be resumed (not completed, not errored)."""
    session = get_session(session_id)
    if not session:
        return False
    return session.get("current_step") not in ("completed",)