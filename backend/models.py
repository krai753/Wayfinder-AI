"""
Wayfinder Backend — Pydantic Models / Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class WizardStep(str, Enum):
    origin = "origin"
    destination = "destination"
    departure_date = "departure_date"
    flight_selection = "flight_selection"
    passenger = "passenger"
    assistance = "assistance"
    confirmation = "confirmation"
    completed = "completed"
    collecting_fields = "collecting_fields"


class AirportSearchRequest(BaseModel):
    q: str = Field(..., min_length=1, description="Search query — city name, airport name, or IATA code")


class AirportResult(BaseModel):
    iata: str
    name: str
    city: str
    country: str
    tz: str = ""


class FlightSearchRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=3, description="IATA code (e.g. JFK)")
    destination: str = Field(..., min_length=3, max_length=3, description="IATA code (e.g. LHR)")
    departure_date: str = Field(..., description="YYYY-MM-DD")
    passengers: int = Field(default=1, ge=1, le=9)
    cabin_class: str = Field(default="economy")


class VoiceSearchRequest(BaseModel):
    """Natural language voice input for flight search (future LLM integration)"""
    text: str = Field(..., description="Natural language query, e.g. 'flights from New York to London tomorrow'")
    session_id: Optional[str] = None


class CreateSessionRequest(BaseModel):
    session_id: Optional[str] = None


class WizardStepRequest(BaseModel):
    session_id: str
    step: WizardStep
    data: dict = Field(default_factory=dict, description="Step-specific data")


class SelectFlightRequest(BaseModel):
    session_id: str
    offer_id: str


class PassengerDetailsRequest(BaseModel):
    session_id: str
    name: str
    assistance: str = Field(default="none", description="Wheelchair, visual, none")


class BookingCreateRequest(BaseModel):
    session_id: str


class BookingResponse(BaseModel):
    id: str
    session_id: str
    status: str
    origin: str
    destination: str
    departure_date: str
    passenger_name: Optional[str] = None
    flight_summary: Optional[str] = None
    total_amount: Optional[str] = None
    booking_reference: Optional[str] = None
    created_at: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    current_step: str
    origin: Optional[str] = None
    origin_name: Optional[str] = None
    destination: Optional[str] = None
    destination_name: Optional[str] = None
    departure_date: Optional[str] = None
    selected_offer_id: Optional[str] = None
    selected_flight_summary: Optional[str] = None
    passenger_name: Optional[str] = None
    passenger_assistance: Optional[str] = None
    booking_reference: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DuffelOffer(BaseModel):
    """Simplified flight offer for the frontend"""
    id: str
    airline: str
    flight_number: str
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    duration: str
    price: str
    currency: str
    cabin_class: str
    stops: int = 0


# ── Reschedule / Cancel / Portfolio ──────────────────────────────


class RescheduleRequest(BaseModel):
    """Request to reschedule a booking."""
    session_id: Optional[str] = None
    booking_id: Optional[str] = None
    new_departure_date: str = Field(..., description="New departure date (YYYY-MM-DD)")


class CancelRequest(BaseModel):
    """Request to cancel a booking."""
    booking_id: Optional[str] = None
    order_id: Optional[str] = None


class ConfirmCancelRequest(BaseModel):
    """Confirm a cancellation after seeing the refund."""
    cancellation_id: str = Field(..., description="The Duffel order cancellation ID to confirm")


class RescheduleOffer(BaseModel):
    """A change offer for rescheduling a flight."""
    offer_id: str
    airline: str
    flight_number: str
    departure_time: str
    arrival_time: str
    price: str
    currency: str
    penalty_amount: str
    change_total: str


class PortfolioResponse(BaseModel):
    """User portfolio / trip history overview."""
    total_trips: int
    total_spent: str
    favorite_route: str
    upcoming_trips: list
    cancelled_count: int


class VoiceCommandRequest(BaseModel):
    """Natural language voice command input."""
    text: str = Field(..., description="The natural language command (e.g. 'book a flight to London')")
    session_id: Optional[str] = None


class VoiceCommandResponse(BaseModel):
    """Structured response from voice command processing."""
    intent: str = Field(..., description="Detected intent: search|book|cancel|reschedule|history|portfolio|budget")
    parameters: dict = Field(default_factory=dict, description="Extracted parameters from the command")
    response_text: str = Field(..., description="Natural language response to speak back to the user")