"""
Wayfinder Backend — Booking Management Router
Cancel, reschedule, history, portfolio, budget features.
"""
import uuid
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from duffel_client import duffel
from config import settings
from database import get_session, get_bookings, save_booking, get_bookings_by_user, get_portfolio_stats, update_booking_status
from models import RescheduleRequest, CancelRequest, ConfirmCancelRequest, PortfolioResponse, RescheduleOffer

router = APIRouter(prefix="/api", tags=["manage"])


# ── 1. CANCEL FLIGHT (Step 1: initiate) ──────────────────────────


@router.post("/booking/{booking_id}/cancel")
async def cancel_booking(booking_id: str):
    """
    Cancel a booking via Duffel Order Cancellations API (step 1).
    Finds the booking in local DB, creates a cancellation, and returns
    refund information without finalising. User must call
    /booking/{booking_id}/cancel/confirm to finalise.

    Returns: cancellation_id, refund_amount, refund_currency, status
    """
    # 1. Look up the booking in local DB
    all_bookings = get_bookings(limit=100)
    booking = None
    for b in all_bookings:
        if b["id"] == booking_id:
            booking = b
            break

    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")

    duffel_order_id = booking.get("duffel_order_id")
    if not duffel_order_id:
        raise HTTPException(status_code=400, detail="Booking has no Duffel order ID — cannot cancel")

    # 2. Create the order cancellation (step 1 — not yet confirmed)
    try:
        headers = settings.duffel_headers
        body = {"data": {"order_id": duffel_order_id}}

        async with httpx.AsyncClient(
            base_url=settings.duffel_api_url.rstrip("/"),
            headers=headers,
            timeout=30.0,
        ) as client:
            resp = await client.post("/air/order_cancellations", json=body)
            resp.raise_for_status()
            cancellation = resp.json()

        cancellation_data = cancellation.get("data", {})
        cancellation_id = cancellation_data.get("id", "")
        refund_amount = cancellation_data.get("refund_amount", "0.00")
        refund_currency = cancellation_data.get("refund_currency", "GBP")
        status = cancellation_data.get("status", "unknown")

        if not cancellation_id:
            raise HTTPException(status_code=502, detail="Failed to create cancellation: no ID returned")

        return {
            "cancellation_id": cancellation_id,
            "booking_id": booking_id,
            "order_id": duffel_order_id,
            "refund_amount": refund_amount,
            "refund_currency": refund_currency,
            "status": status,
            "message": f"Cancellation initiated. Refund of {refund_amount} {refund_currency} available. "
                       f"Call /booking/{booking_id}/cancel/confirm to finalise.",
        }

    except httpx.HTTPStatusError as e:
        detail = f"Duffel API error: {e.response.status_code}"
        try:
            detail += f" — {e.response.json()}"
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Cancellation failed: {str(e)}")


# ── 2. CONFIRM CANCELLATION (Step 2: finalise) ────────────────────


@router.post("/booking/{booking_id}/cancel/confirm")
async def confirm_cancellation(booking_id: str, req: ConfirmCancelRequest):
    """
    Confirm a cancellation to finalise it.
    Accepts a cancellation_id (obtained from the cancel step) in the request body.
    Updates the local booking status to 'cancelled'.
    """
    # 1. Confirm via Duffel
    try:
        headers = settings.duffel_headers

        async with httpx.AsyncClient(
            base_url=settings.duffel_api_url.rstrip("/"),
            headers=headers,
            timeout=30.0,
        ) as client:
            confirm_resp = await client.post(
                f"/air/order_cancellations/{req.cancellation_id}/confirm"
            )
            confirm_resp.raise_for_status()
            confirmed = confirm_resp.json()

        confirmed_data = confirmed.get("data", {})
        refund_amount = confirmed_data.get("refund_amount", "0.00")
        refund_currency = confirmed_data.get("refund_currency", "GBP")
        status = confirmed_data.get("status", "unknown")

        # 2. Update local booking status
        update_booking_status(booking_id, "cancelled")

        return {
            "cancellation_id": req.cancellation_id,
            "booking_id": booking_id,
            "status": status,
            "refund_amount": refund_amount,
            "refund_currency": refund_currency,
            "message": f"Booking {booking_id} has been cancelled. "
                       f"Refund of {refund_amount} {refund_currency} processed.",
        }

    except httpx.HTTPStatusError as e:
        detail = f"Duffel API error: {e.response.status_code}"
        try:
            detail += f" — {e.response.json()}"
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Confirm cancellation failed: {str(e)}")


# ── 3. RESCHEDULE — Search new options ────────────────────────────


@router.post("/booking/{booking_id}/reschedule/search")
async def reschedule_search(booking_id: str, new_date: str = Query(..., description="New departure date (YYYY-MM-DD)")):
    """
    Search for reschedule options on a new date.
    Uses Duffel Order Change Requests API to find change offers with pricing.
    Returns available change offers with penalty and total amounts.
    """
    # 1. Find the booking
    all_bookings = get_bookings(limit=100)
    booking = None
    for b in all_bookings:
        if b["id"] == booking_id:
            booking = b
            break

    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")

    duffel_order_id = booking.get("duffel_order_id")
    if not duffel_order_id:
        raise HTTPException(status_code=400, detail="Booking has no Duffel order ID — cannot reschedule")

    # 2. Fetch the full order from Duffel to get passenger and slice info
    try:
        order_data = await duffel.get_order(duffel_order_id)
        order = order_data.get("data", {})

        # Build slices_to_add from the existing order route with the new date
        existing_slices = order.get("slices", [])
        if not existing_slices:
            raise HTTPException(status_code=400, detail="Order has no slices to reschedule")

        slices_to_add = []
        for s in existing_slices:
            segments = s.get("segments", [])
            if not segments:
                continue
            first = segments[0]
            last = segments[-1]
            origin = first.get("origin", {}).get("iata_code", "")
            destination = last.get("destination", {}).get("iata_code", "")
            slices_to_add.append({
                "origin": origin,
                "destination": destination,
                "departure_date": new_date,
            })

        # Build passenger list from the order
        passengers_from_order = order.get("passengers", [])
        if not passengers_from_order:
            # Fallback: use booking passenger name
            passenger_name = booking.get("passenger_name", "Passenger")
            given, family = duffel._split_name(passenger_name)
            passengers = [{"id": "pas_0000placeholder", "given_name": given, "family_name": family}]
        else:
            passengers = [
                {
                    "id": p.get("id", "pas_0000placeholder"),
                    "given_name": p.get("given_name", ""),
                    "family_name": p.get("family_name", ""),
                }
                for p in passengers_from_order
            ]

        # 3. Create the change request
        change_result = await duffel.create_change_request(
            order_id=duffel_order_id,
            slices_to_add=slices_to_add,
            passengers=passengers,
        )

        return {
            "booking_id": booking_id,
            "order_id": duffel_order_id,
            "new_date": new_date,
            "order_change_request_id": change_result["order_change_request_id"],
            "change_offers": change_result["change_offers"],
            "offer_count": len(change_result["change_offers"]),
            "message": f"Found {len(change_result['change_offers'])} reschedule options for {new_date}. "
                       f"Use /booking/{booking_id}/reschedule/confirm to select one.",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Reschedule search failed: {str(e)}")


# ── 4. RESCHEDULE — Confirm ───────────────────────────────────────


@router.post("/booking/{booking_id}/reschedule/confirm")
async def confirm_reschedule(booking_id: str, change_offer_id: str = Query(..., description="Change offer ID to confirm")):
    """
    Confirm and execute the reschedule by selecting a change offer.
    Updates local booking with new Duffel order info.
    """
    # 1. Find the booking
    all_bookings = get_bookings(limit=100)
    booking = None
    for b in all_bookings:
        if b["id"] == booking_id:
            booking = b
            break

    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")

    # 2. Confirm the change via Duffel
    try:
        change_result = await duffel.confirm_change(change_offer_id)

        new_order_id = change_result.get("order_id", "")
        status = change_result.get("status", "")

        # 3. Update local booking
        updates = {"duffel_order_id": new_order_id} if new_order_id else {}
        update_booking_status(booking_id, "rescheduled", **updates)

        return {
            "booking_id": booking_id,
            "order_change_id": change_result.get("order_change_id", ""),
            "new_order_id": new_order_id,
            "status": status,
            "message": f"Booking {booking_id} has been rescheduled successfully.",
        }

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Reschedule confirmation failed: {str(e)}")


# ── 5. FLIGHT HISTORY ─────────────────────────────────────────────


@router.get("/user/{user_id}/history")
async def flight_history(user_id: str, limit: int = 20):
    """
    Get flight history for a user.
    Returns bookings ordered by most recent first.
    """
    try:
        bookings = get_bookings_by_user(user_id)
        # Apply limit
        limited = bookings[:limit] if limit else bookings

        return {
            "user_id": user_id,
            "count": len(limited),
            "total_count": len(bookings),
            "bookings": limited,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


# ── 6. FLIGHT PORTFOLIO ───────────────────────────────────────────


@router.get("/user/{user_id}/portfolio", response_model=PortfolioResponse)
async def flight_portfolio(user_id: str):
    """
    Get personal flight portfolio stats.
    Includes total trips, total spent, favourite route, upcoming trips,
    and cancellation count.
    """
    try:
        stats = get_portfolio_stats(user_id)

        return PortfolioResponse(
            total_trips=stats["total_bookings"],
            total_spent=stats["total_spent"],
            favorite_route=stats["favorite_route"],
            upcoming_trips=stats["upcoming_trips"],
            cancelled_count=stats["cancelled_count"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")


# ── 7. BUDGET SEARCH ──────────────────────────────────────────────


@router.get("/flights/budget")
async def budget_search(
    origin: str = Query(..., min_length=3, max_length=3, description="Origin IATA code (e.g. JFK)"),
    destination: str = Query(..., min_length=3, max_length=3, description="Destination IATA code (e.g. LHR)"),
    departure_date: str = Query(..., description="Departure date (YYYY-MM-DD)"),
    max_price: float = Query(..., gt=0, description="Maximum price in the currency returned"),
    passengers: int = Query(1, ge=1, le=9, description="Number of passengers"),
):
    """
    Search flights within a budget.
    Searches flights via Duffel and filters results to those within the max_price.
    Returns only offers that are under or equal to the budget.
    """
    # Validate airports
    from airport_data import get_airport
    origin_info = get_airport(origin.upper())
    destination_info = get_airport(destination.upper())

    if not origin_info:
        raise HTTPException(status_code=400, detail=f"Unknown origin airport: {origin}")
    if not destination_info:
        raise HTTPException(status_code=400, detail=f"Unknown destination airport: {destination}")

    try:
        raw_response = await duffel.search_flights(
            origin=origin.upper(),
            destination=destination.upper(),
            departure_date=departure_date,
            passengers=passengers,
        )

        offers = duffel.simplify_offers(raw_response)

        # Filter by budget
        budget_offers = []
        for offer in offers:
            try:
                price = float(offer["price"])
                if price <= max_price:
                    budget_offers.append(offer)
            except (ValueError, TypeError):
                continue  # Skip offers with unparseable prices

        return {
            "origin": origin.upper(),
            "origin_name": origin_info.get("city", origin.upper()),
            "destination": destination.upper(),
            "destination_name": destination_info.get("city", destination.upper()),
            "departure_date": departure_date,
            "passengers": passengers,
            "max_price": max_price,
            "total_offers_found": len(offers),
            "offers_within_budget": len(budget_offers),
            "offers": budget_offers,
            "message": (
                f"Found {len(budget_offers)} flights within £{max_price:.2f} "
                f"out of {len(offers)} total options."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Budget search failed: {str(e)}")