"""
Wayfinder Backend — Search Router
Airport fuzzy search + flight search via Duffel
"""

from fastapi import APIRouter, HTTPException, Query
from models import AirportSearchRequest, FlightSearchRequest, DuffelOffer
from airport_data import search_airports, get_airport
from duffel_client import duffel

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/airports")
async def airport_search(q: str = Query(..., min_length=1, description="Airport name, city, or IATA code")):
    """Fuzzy search for airports by name, city, or IATA code."""
    results = search_airports(q, limit=10)
    return {
        "query": q,
        "count": len(results),
        "airports": results,
    }


@router.get("/airports/{iata}")
async def airport_detail(iata: str):
    """Get details for a specific IATA airport code."""
    apt = get_airport(iata.upper())
    if not apt:
        raise HTTPException(status_code=404, detail=f"Airport '{iata}' not found")
    return apt


@router.post("/flights/search")
async def flight_search(req: FlightSearchRequest):
    """Search for flights using Duffel Offer Requests API."""
    # Validate airports exist locally
    origin = get_airport(req.origin.upper())
    destination = get_airport(req.destination.upper())
    if not origin:
        raise HTTPException(status_code=400, detail=f"Unknown origin airport: {req.origin}")
    if not destination:
        raise HTTPException(status_code=400, detail=f"Unknown destination airport: {req.destination}")

    try:
        raw_response = await duffel.search_flights(
            origin=req.origin.upper(),
            destination=req.destination.upper(),
            departure_date=req.departure_date,
            passengers=req.passengers,
            cabin_class=req.cabin_class,
        )

        offers = duffel.simplify_offers(raw_response)

        return {
            "origin": req.origin.upper(),
            "origin_name": origin.get("city", req.origin.upper()),
            "destination": req.destination.upper(),
            "destination_name": destination.get("city", req.destination.upper()),
            "departure_date": req.departure_date,
            "passengers": req.passengers,
            "offer_count": len(offers),
            "offers": offers,
            "raw_response": raw_response,  # Full data for frontend parsing
        }

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Flight search failed: {str(e)}",
        )


@router.get("/flights/offers/{offer_id}")
async def offer_detail(offer_id: str):
    """Get details for a specific flight offer."""
    try:
        offer = await duffel.get_offer(offer_id)
        return offer
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch offer: {str(e)}")