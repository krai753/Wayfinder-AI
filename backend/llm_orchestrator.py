"""
Wayfinder AI — LLM Orchestration Engine
Rule-based natural language parser for voice commands.
No external API needed — works offline and instantly.
"""
import re
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("wayfinder.llm")

# City → IATA mapping
CITY_TO_IATA = {
    "new york": "JFK", "nyc": "JFK", "london": "LHR", "paris": "CDG",
    "tokyo": "NRT", "dubai": "DXB", "dubai": "DXB", "singapore": "SIN",
    "bangkok": "BKK", "mumbai": "BOM", "delhi": "DEL", "sydney": "SYD",
    "melbourne": "MEL", "frankfurt": "FRA", "munich": "MUC", "amsterdam": "AMS",
    "rome": "FCO", "milan": "MXP", "madrid": "MAD", "barcelona": "BCN",
    "los angeles": "LAX", "san francisco": "SFO", "chicago": "ORD",
    "boston": "BOS", "washington": "IAD", "miami": "MIA", "toronto": "YYZ",
    "vancouver": "YVR", "hong kong": "HKG", "seoul": "ICN", "beijing": "PEK",
    "shanghai": "PVG", "istanbul": "IST", "doha": "DOH", "abu dhabi": "AUH",
    "zurich": "ZRH", "geneva": "GVA", "vienna": "VIE", "copenhagen": "CPH",
    "stockholm": "ARN", "oslo": "OSL", "helsinki": "HEL", "brussels": "BRU",
    "dublin": "DUB", "manchester": "MAN", "edinburgh": "EDI", "berlin": "BER",
    "lisbon": "LIS", "athens": "ATH", "prague": "PRG", "warsaw": "WAW",
    "budapest": "BUD", "kuala lumpur": "KUL", "jakarta": "CGK", "manila": "MNL",
    "ho chi minh": "SGN", "hanoi": "HAN", "cairo": "CAI", "casablanca": "CMN",
    "johannesburg": "JNB", "nairobi": "NBO", "lagos": "LOS", "sao paulo": "GRU",
    "rio de janeiro": "GIG", "buenos aires": "EZE", "santiago": "SCL",
    "mexico city": "MEX", "denver": "DEN", "seattle": "SEA", "atlanta": "ATL",
    "dallas": "DFW", "houston": "IAH", "las vegas": "LAS", "orlando": "MCO",
}

MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
}


def _resolve_city(name: str) -> str:
    """Convert a city name or partial name to IATA code."""
    name = name.strip().lower()
    if len(name) == 3 and name.isalpha():
        return name.upper()  # Already an IATA code
    if name in CITY_TO_IATA:
        return CITY_TO_IATA[name]
    # Partial match
    for key, iata in CITY_TO_IATA.items():
        if name in key or key.startswith(name):
            return iata
    return name.upper() if len(name) == 3 else ""


def _resolve_date(text: str) -> str:
    """Parse date phrases into YYYY-MM-DD format.
    Handles: 'tomorrow', 'next tuesday', 'July 15th', '07/15', '2026-07-15'
    """
    text = text.lower().strip()
    today = datetime.now()

    # "tomorrow"
    if text == "tomorrow":
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")

    # "next [weekday]"
    m = re.search(r"next\s+(\w+)", text)
    if m:
        day_name = m.group(1)
        if day_name in WEEKDAYS:
            target = WEEKDAYS[day_name]
            days_ahead = (target - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7  # Next week, not today
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # "this [weekday]"
    m = re.search(r"this\s+(\w+)", text)
    if m:
        day_name = m.group(1)
        if day_name in WEEKDAYS:
            target = WEEKDAYS[day_name]
            days_ahead = (target - today.weekday()) % 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # "July 15th", "July 15", "15 July"
    m = re.search(r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?", text)
    if m:
        month_name = m.group(1).lower()
        day = int(m.group(2))
        if month_name in MONTH_NAMES:
            month = MONTH_NAMES[month_name]
            year = today.year
            # If the date has passed, use next year
            test_date = datetime(year, month, day)
            if test_date < today:
                year += 1
            return f"{year}-{month:02d}-{day:02d}"

    # "MM/DD" or "MM/DD/YYYY"
    m = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{4}))?", text)
    if m:
        month, day = int(m.group(1)), int(m.group(2))
        year = int(m.group(3)) if m.group(3) else today.year
        return f"{year}-{month:02d}-{day:02d}"

    # "YYYY-MM-DD"
    m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if m:
        return m.group(1)

    return ""


def _extract_price(text: str) -> float | None:
    """Extract a price from text like 'under $300', 'less than 500 dollars'."""
    m = re.search(r"(?:under|less than|budget of|max|up to)\s*\$?(\d{2,5})", text.lower())
    if m:
        return float(m.group(1))
    m = re.search(r"\$(\d{2,5})", text)
    if m:
        return float(m.group(1))
    return None


class LLMOrchestrator:
    """Rule-based natural language parser for voice commands.
    No external API needed — instant, predictable, works offline."""

    async def parse_command(self, text: str, context: dict = None) -> dict:
        """
        Parse natural language into a structured voice command.
        Returns: {"intent": "...", "parameters": {...}, "response_text": "..."}
        """
        text_clean = text.strip()
        text_lower = text_clean.lower()

        # ── Detect intent ──────────────────────────────────────────

        # HELP / GREETING
        if any(w in text_lower for w in ["help", "what can you", "how does", "hello", "hi "]):
            return {
                "intent": "help",
                "parameters": {},
                "response_text": "I can help you book flights, cancel or reschedule bookings, check your travel history, and find flights within your budget. Just tell me where you want to go!"
            }

        # HISTORY
        if any(w in text_lower for w in ["my history", "past flights", "my trips", "show my flights",
                                           "flight history", "previous booking", "what i booked"]):
            return {
                "intent": "view_history",
                "parameters": {},
                "response_text": "Let me look up your flight history."
            }

        # PORTFOLIO
        if any(w in text_lower for w in ["my portfolio", "my stats", "how many flights",
                                           "total spent", "favorite route", "flight stats"]):
            return {
                "intent": "view_portfolio",
                "parameters": {},
                "response_text": "Here are your travel statistics."
            }

        # CANCEL
        if any(w in text_lower for w in ["cancel", "cancel my", "i want to cancel"]):
            booking_id = None
            if context and context.get("session_id"):
                booking_id = context.get("session_id")
            return {
                "intent": "cancel_booking",
                "parameters": {"booking_id": booking_id or "latest"},
                "response_text": "I'll help you cancel that booking."
            }

        # RESCHEDULE
        if any(w in text_lower for w in ["reschedule", "change my flight", "move my flight",
                                           "change date", "different day"]):
            new_date = _resolve_date(text_lower)
            return {
                "intent": "reschedule_booking",
                "parameters": {
                    "booking_id": "latest",
                    "new_date": new_date,
                },
                "response_text": f"I'll look for reschedule options{' on ' + new_date if new_date else ''}."
            }

        # BUDGET / SEARCH FLIGHTS
        max_price = _extract_price(text_lower)
        has_search_words = any(w in text_lower for w in ["book", "flight", "fly", "travel",
                                                          "going to", "want to go", "find",
                                                          "search", "trip", "take me"])

        # Extract cities
        cities = []
        for name, iata in sorted(CITY_TO_IATA.items(), key=lambda x: -len(x[0])):
            if name in text_lower:
                cities.append(iata)
                if len(cities) >= 2:
                    break

        # Also try 3-letter uppercase codes in text
        if len(cities) < 2:
            codes = re.findall(r'\b([A-Z]{3})\b', text_clean)
            for c in codes:
                if c not in cities and len(cities) < 2:
                    cities.append(c)

        origin = None
        destination = None
        if len(cities) >= 2:
            origin = cities[0]
            destination = cities[1]
        elif context:
            origin = context.get("origin")
            destination = context.get("destination")

        departure_date = _resolve_date(text_lower)
        if not departure_date and context:
            departure_date = context.get("departure_date")

        if max_price and has_search_words:
            return {
                "intent": "search_with_budget",
                "parameters": {
                    "origin": origin or "",
                    "destination": destination or "",
                    "date": departure_date or "",
                    "max_price": max_price,
                },
                "response_text": f"Searching for flights{' from ' + origin if origin else ''}{' to ' + destination if destination else ''}{' under $' + str(int(max_price)) if max_price else ''}."
            }

        if has_search_words:
            return {
                "intent": "search_flights",
                "parameters": {
                    "origin": origin or "",
                    "destination": destination or "",
                    "date": departure_date or "",
                    "max_price": max_price,
                },
                "response_text": f"Looking for flights{' from ' + origin if origin else ''}{' to ' + destination if destination else ''}{' on ' + departure_date if departure_date else ''}."
            }

        # BOOK — requires session context
        if "book" in text_lower and context and context.get("session_id"):
            return {
                "intent": "book_flight",
                "parameters": {"session_id": context["session_id"]},
                "response_text": "Let me complete your booking."
            }

        # Fallback — help
        return {
            "intent": "help",
            "parameters": {},
            "response_text": "I didn't quite catch that. Try saying: 'Book a flight from New York to London' or 'Cancel my booking' or 'Show my flight history'."
        }


llm = LLMOrchestrator()
