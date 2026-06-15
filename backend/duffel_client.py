"""
Wayfinder Backend — Duffel API Client
Wraps Duffel's REST API for flight search and booking.
Docs: https://developers.duffel.com
"""

import json
import httpx
from config import settings
from typing import Optional


class DuffelClient:
    """HTTP client for the Duffel Air API."""

    BASE = settings.duffel_api_url.rstrip("/")
    HEADERS = settings.duffel_headers

    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=self.BASE,
            headers=self.HEADERS,
            timeout=30.0,
        )

    async def close(self):
        await self.client.aclose()

    # ── Airports ────────────────────────────────────────────────

    async def list_airports(self) -> list[dict]:
        """Fetch all airports from Duffel (cached locally)."""
        all_airports = []
        url = "/air/airports"
        while url:
            resp = await self.client.get(url)
            resp.raise_for_status()
            data = resp.json()
            all_airports.extend(data.get("data", []))
            meta = data.get("meta", {})
            after = meta.get("after")
            if after:
                url = f"/air/airports?after={after}"
            else:
                url = None
        return all_airports

    # ── Flight Search (Offer Requests) ──────────────────────────

    async def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        passengers: int = 1,
        cabin_class: str = "economy",
    ) -> dict:
        """
        Search flights via Duffel Offer Requests API (v2).
        Returns the full API response.
        """
        body = {
            "data": {
                "slices": [
                    {
                        "origin": origin,
                        "destination": destination,
                        "departure_date": departure_date,
                    }
                ],
                "passengers": [{"type": "adult"} for _ in range(passengers)],
                "cabin_class": cabin_class,
            }
        }

        resp = await self.client.post(
            "/air/offer_requests?supplier_timeout=10000",
            json=body,
        )
        resp.raise_for_status()
        return resp.json()

    # ── Offer Details ───────────────────────────────────────────

    async def get_offer(self, offer_id: str) -> dict:
        """Get a single offer by ID."""
        resp = await self.client.get(f"/air/offers/{offer_id}")
        resp.raise_for_status()
        return resp.json()

    # ── Booking (Orders) ────────────────────────────────────────

    async def create_order(
        self,
        offer_id: str,
        passenger_name: str,
        passenger_id: str = "pas_0000placeholder",
        passenger_email: str = "passenger@wayfinder.app",
        phone_number: str = "+447700000000",
        born_on: str = "1990-01-15",
        total_amount: str = "0.00",
        currency: str = "GBP",
    ) -> dict:
        """
        Create a booking order from a selected offer (v2).
        Returns the order details.
        """
        given_name, family_name = self._split_name(passenger_name)
        body = {
            "data": {
                "selected_offers": [offer_id],
                "passengers": [
                    {
                        "id": passenger_id,
                        "given_name": given_name,
                        "family_name": family_name,
                        "title": "Mr",
                        "gender": "m",
                        "born_on": born_on,
                        "email": passenger_email,
                        "phone_number": phone_number,
                        "type": "adult",
                    }
                ],
                "payments": [
                    {
                        "type": "balance",
                        "amount": total_amount,
                        "currency": currency,
                    }
                ],
            }
        }
        resp = await self.client.post("/air/orders", json=body)
        resp.raise_for_status()
        return resp.json()

    async def get_order(self, order_id: str) -> dict:
        """Get order details by ID."""
        resp = await self.client.get(f"/air/orders/{order_id}")
        resp.raise_for_status()
        return resp.json()

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _split_name(full_name: str):
        """Split a full name into given_name and family_name."""
        parts = full_name.strip().split(None, 1)
        if len(parts) == 1:
            return parts[0], "Passenger"
        return parts[0], parts[1]

    @staticmethod
    def simplify_offers(offer_request_response: dict) -> list[dict]:
        """
        Extract simplified flight offers from an offer request response.
        Returns list of dicts with: id, airline, flight_number, origin, destination,
        departure_time, arrival_time, duration, price, currency, cabin_class, stops
        """
        offers = offer_request_response.get("data", {}).get("offers", [])
        simplified = []

        for offer in offers:
            total_amount = offer.get("total_amount", "0")
            total_currency = offer.get("total_currency", "GBP")
            cabin_class = (offer.get("cabin_class") or "economy").capitalize()

            slices = offer.get("slices", [])
            for slice_ in slices:
                segments = slice_.get("segments", [])
                if not segments:
                    continue

                first_seg = segments[0]
                last_seg = segments[-1]

                airline = first_seg.get("operating_carrier", {}).get("name", "Unknown")
                flight_number = (
                    f"{first_seg.get('operating_carrier', {}).get('iata_code', '')}"
                    f"{first_seg.get('flight_number', '')}"
                )
                departure_time = first_seg.get("departing_at", "")
                arrival_time = last_seg.get("arriving_at", "")
                origin_code = first_seg.get("origin", {}).get("iata_code", "")
                dest_code = last_seg.get("destination", {}).get("iata_code", "")
                stops = len(segments) - 1

                # Calculate duration
                dur_minutes = 0
                for seg in segments:
                    dep = seg.get("departing_at", "")
                    arr = seg.get("arriving_at", "")
                    if dep and arr:
                        from datetime import datetime
                        try:
                            d = datetime.fromisoformat(dep.replace("Z", "+00:00"))
                            a = datetime.fromisoformat(arr.replace("Z", "+00:00"))
                            dur_minutes += int((a - d).total_seconds() / 60)
                        except Exception:
                            pass
                hours = dur_minutes // 60
                mins = dur_minutes % 60
                duration_str = f"{hours}h {mins:02d}m"

                simplified.append({
                    "id": offer["id"],
                    "airline": airline,
                    "flight_number": flight_number,
                    "origin": origin_code,
                    "destination": dest_code,
                    "departure_time": departure_time,
                    "arrival_time": arrival_time,
                    "duration": duration_str,
                    "price": total_amount,
                    "currency": total_currency,
                    "cabin_class": cabin_class,
                    "stops": stops,
                    "passenger_id": offer.get("passengers", [{}])[0].get("id", ""),
                })

            # If no slices processed but we have the offer
            if not simplified:
                simplified.append({
                    "id": offer["id"],
                    "airline": offer.get("owner", {}).get("name", "Unknown"),
                    "flight_number": "",
                    "origin": "",
                    "destination": "",
                    "departure_time": "",
                    "arrival_time": "",
                    "duration": "",
                    "price": total_amount,
                    "currency": total_currency,
                    "cabin_class": cabin_class,
                    "stops": 0,
                })

        return simplified


duffel = DuffelClient()