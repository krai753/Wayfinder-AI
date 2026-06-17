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

    # ── Cancellations ──────────────────────────────────────────

    async def cancel_order(self, order_id: str) -> dict:
        """
        Cancel a booking order via Duffel Order Cancellations API.
        POST /air/order_cancellations to initiate, then POST .../confirm to confirm.
        Returns the cancellation result with refund amount.
        """
        # Step 1: Create the order cancellation
        body = {
            "data": {
                "order_id": order_id,
            }
        }
        resp = await self.client.post("/air/order_cancellations", json=body)
        resp.raise_for_status()
        cancellation = resp.json()
        cancellation_data = cancellation.get("data", {})
        cancellation_id = cancellation_data.get("id", "")

        if not cancellation_id:
            raise RuntimeError("Failed to create order cancellation: no ID returned")

        # Step 2: Confirm the cancellation
        confirm_resp = await self.client.post(
            f"/air/order_cancellations/{cancellation_id}/confirm"
        )
        confirm_resp.raise_for_status()
        confirmed = confirm_resp.json()

        # Extract refund info
        confirmed_data = confirmed.get("data", {})
        refund_amount = confirmed_data.get("refund_amount", "0.00")
        refund_currency = confirmed_data.get("refund_currency", "GBP")
        status = confirmed_data.get("status", "unknown")

        return {
            "cancellation_id": cancellation_id,
            "status": status,
            "refund_amount": refund_amount,
            "refund_currency": refund_currency,
            "order_id": order_id,
            "raw_response": confirmed,
        }

    # ── Order Changes / Rescheduling ───────────────────────────

    async def create_change_request(
        self,
        order_id: str,
        slices_to_add: list[dict],
        passengers: list[dict],
    ) -> dict:
        """
        Create an order change request to reschedule a booking.
        POST /air/order_change_requests with new slice data.

        Args:
            order_id: The Duffel order ID to change.
            slices_to_add: List of new slice dicts, each with:
                          {origin, destination, departure_date}
            passengers: List of passenger dicts, each with {id, given_name, family_name, ...}

        Returns change offers with price differences and penalties.
        """
        body = {
            "data": {
                "order_id": order_id,
                "slices": {
                    "add": slices_to_add,
                },
                "passengers": passengers,
            }
        }

        resp = await self.client.post(
            "/air/order_change_requests?supplier_timeout=10000",
            json=body,
        )
        resp.raise_for_status()
        result = resp.json()

        # Extract change offers with pricing
        change_offers = result.get("data", {}).get("change_offers", [])
        simplified = []
        for offer in change_offers:
            total_penalty_amount = offer.get("total_penalty_amount", "0.00")
            total_penalty_currency = offer.get("total_penalty_currency", "GBP")
            new_total_amount = offer.get("new_total_amount", "0.00")
            new_total_currency = offer.get("new_total_currency", "GBP")

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
                simplified.append({
                    "offer_id": offer["id"],
                    "airline": airline,
                    "flight_number": flight_number,
                    "departure_time": first_seg.get("departing_at", ""),
                    "arrival_time": last_seg.get("arriving_at", ""),
                    "price": new_total_amount,
                    "currency": new_total_currency,
                    "penalty_amount": total_penalty_amount,
                    "penalty_currency": total_penalty_currency,
                    "change_total": str(float(total_penalty_amount) + float(new_total_amount)),
                })

        return {
            "order_change_request_id": result.get("data", {}).get("id", ""),
            "change_offers": simplified,
            "raw_response": result,
        }

    async def confirm_change(self, order_change_offer_id: str) -> dict:
        """
        Confirm an order change by creating the actual order change.
        Returns the confirmed order change details.
        """
        body = {
            "data": {
                "selected_order_change_offer": order_change_offer_id,
            }
        }

        resp = await self.client.post("/air/order_changes", json=body)
        resp.raise_for_status()
        result = resp.json()

        order_change_data = result.get("data", {})
        return {
            "order_change_id": order_change_data.get("id", ""),
            "order_id": order_change_data.get("order_id", ""),
            "status": order_change_data.get("status", ""),
            "raw_response": result,
        }

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