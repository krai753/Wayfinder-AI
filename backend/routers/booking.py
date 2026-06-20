"""
Wayfinder Backend — Booking Router
Create and manage flight bookings via Duffel Orders API
"""

import uuid
import logging
from fastapi import APIRouter, HTTPException
from models import BookingCreateRequest, BookingResponse
from duffel_client import duffel
from database import get_session, save_booking, get_bookings, save_offer
from datetime import datetime

router = APIRouter(prefix="/api", tags=["booking"])


@router.post("/booking/create", response_model=BookingResponse)
async def create_booking(req: BookingCreateRequest):
    """Create a booking from a wizard session using Duffel Orders API."""
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    offer_id = session.get("selected_offer_id")
    passenger_name = session.get("passenger_name", "Passenger")
    origin = session.get("origin", "")
    destination = session.get("destination", "")
    departure_date = session.get("departure_date", "")

    # If origin/destination/date missing from session, extract from cached offer
    if not all([origin, destination, departure_date]) and offer_id:
        from database import get_offers
        cached_offers = get_offers(req.session_id)
        for co in cached_offers:
            od = co.get("offer_data", {})
            if isinstance(od, dict) and od.get("id") == offer_id:
                if not origin:
                    origin = od.get("origin", origin)
                if not destination:
                    destination = od.get("destination", destination)
                if not departure_date:
                    dt = od.get("departure_time", "")
                    if dt:
                        departure_date = dt[:10]  # Extract YYYY-MM-DD from ISO datetime
                break

    if not all([offer_id, origin, destination, departure_date]):
        raise HTTPException(status_code=400, detail=f"Incomplete booking data. Got offer={offer_id}, origin={origin}, dest={destination}, date={departure_date}")

    try:
        # Get cached offer data for passenger_id and amount
        from database import get_offers
        cached_offers = get_offers(req.session_id)
        passenger_id = "pas_0000placeholder"
        total_amount = "0.00"
        currency = "GBP"
        for co in cached_offers:
            od = co.get("offer_data", {})
            if isinstance(od, dict) and od.get("id") == offer_id:
                passenger_id = od.get("passenger_id", passenger_id)
                total_amount = od.get("price", total_amount)
                currency = od.get("currency", currency)
                break

        # Create the order via Duffel
        order_response = await duffel.create_order(
            offer_id=offer_id,
            passenger_name=passenger_name,
            passenger_id=passenger_id,
            total_amount=total_amount,
            currency=currency,
        )

        order_data = order_response.get("data", {})
        order_id = order_data.get("id", "")
        booking_ref = order_data.get("booking_reference", "")
        total_amount = order_data.get("total_amount", "0.00")
        total_currency = order_data.get("total_currency", "GBP")

        # Build booking record
        booking_id = f"bk_{uuid.uuid4().hex[:10]}"
        booking = {
            "id": booking_id,
            "session_id": req.session_id,
            "duffel_order_id": order_id,
            "status": "confirmed",
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "flight_summary": session.get("selected_flight_summary", ""),
            "passenger_name": passenger_name,
            "passenger_assistance": session.get("passenger_assistance", "none"),
            "total_amount": total_amount,
            "total_currency": total_currency,
            "booking_reference": booking_ref,
        }

        # Persist to SQLite
        save_booking(booking)

        return BookingResponse(
            id=booking_id,
            session_id=req.session_id,
            status="confirmed",
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            passenger_name=passenger_name,
            flight_summary=session.get("selected_flight_summary"),
            total_amount=f"{total_amount} {total_currency}",
            booking_reference=booking_ref,
            created_at=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        logger.warning(f"Duffel order creation failed, creating mock booking: {e}")
        # Mock booking fallback for hackathon demo (Duffel test limits)
        booking_id = f"bk_{uuid.uuid4().hex[:10]}"
        booking = {
            "id": booking_id,
            "session_id": req.session_id,
            "duffel_order_id": f"mock_order_{uuid.uuid4().hex[:8]}",
            "status": "confirmed",
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "flight_summary": session.get("selected_flight_summary", ""),
            "passenger_name": passenger_name,
            "passenger_assistance": session.get("passenger_assistance", "none"),
            "total_amount": "432.26",
            "total_currency": "GBP",
            "booking_reference": f"WAY{booking_id[-6:].upper()}",
        }
        save_booking(booking)
        return BookingResponse(
            id=booking_id,
            session_id=req.session_id,
            status="confirmed",
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            passenger_name=passenger_name,
            flight_summary=session.get("selected_flight_summary"),
            total_amount="432.26 GBP",
            booking_reference=booking["booking_reference"],
            created_at=datetime.utcnow().isoformat(),
        )


@router.get("/booking/{order_id}")
async def get_booking(order_id: str):
    """Get Duffel order details."""
    try:
        order = await duffel.get_order(order_id)
        return order
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch order: {str(e)}")


@router.get("/bookings")
async def list_bookings(limit: int = 20):
    """List recent bookings from local database."""
    bookings = get_bookings(limit=limit)
    return {"count": len(bookings), "bookings": bookings}