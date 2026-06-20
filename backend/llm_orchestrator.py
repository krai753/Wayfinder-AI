"""
Wayfinder AI — LLM Orchestration Engine v2
Free-form NLP parser with bilingual support, flight-only hard wall.
- Detects user's language → translates to English → parses → responds in user's language
- Extracts origin, destination, date, price, passengers from ANY phrasing
- Rejects everything not related to flight booking
"""
import re
import logging
from datetime import datetime, timedelta

logger = logging.getLogger("wayfinder.llm")

# ── Language detection + translation ─────────────────────────────────

def _detect_language(text: str) -> str:
    """Detect the language of the input text."""
    try:
        from langdetect import detect
        lang = detect(text)
        return lang if lang else "en"
    except Exception:
        return "en"


def _translate_to_english(text: str, source_lang: str = "") -> str:
    """Translate text to English using deep-translator (Google Translate, free)."""
    if source_lang == "en" or not source_lang:
        return text
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source=source_lang, target="en")
        return translator.translate(text)
    except Exception as e:
        logger.warning(f"Translation to English failed: {e}")
        return text


def _translate_text(text: str, target_lang: str) -> str:
    """Translate text from English to target language."""
    if target_lang == "en" or not target_lang:
        return text
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source="en", target=target_lang)
        return translator.translate(text)
    except Exception as e:
        logger.warning(f"Translation to {target_lang} failed: {e}")
        return text


# ── City / IATA mapping (expanded) ───────────────────────────────────

CITY_TO_IATA = {
    "new york": "JFK", "nyc": "JFK", "london": "LHR", "heathrow": "LHR",
    "gatwick": "LGW", "paris": "CDG", "tokyo": "NRT", "narita": "NRT",
    "haneda": "HND", "dubai": "DXB", "singapore": "SIN", "changi": "SIN",
    "bangkok": "BKK", "mumbai": "BOM", "delhi": "DEL", "sydney": "SYD",
    "melbourne": "MEL", "frankfurt": "FRA", "munich": "MUC", "amsterdam": "AMS",
    "schiphol": "AMS", "rome": "FCO", "milan": "MXP", "madrid": "MAD",
    "barcelona": "BCN", "los angeles": "LAX", "san francisco": "SFO",
    "chicago": "ORD", "boston": "BOS", "washington": "IAD", "miami": "MIA",
    "toronto": "YYZ", "vancouver": "YVR", "hong kong": "HKG", "seoul": "ICN",
    "beijing": "PEK", "shanghai": "PVG", "istanbul": "IST", "doha": "DOH",
    "abu dhabi": "AUH", "zurich": "ZRH", "geneva": "GVA", "vienna": "VIE",
    "copenhagen": "CPH", "stockholm": "ARN", "oslo": "OSL", "helsinki": "HEL",
    "brussels": "BRU", "dublin": "DUB", "manchester": "MAN", "edinburgh": "EDI",
    "berlin": "BER", "lisbon": "LIS", "athens": "ATH", "prague": "PRG",
    "warsaw": "WAW", "budapest": "BUD", "kuala lumpur": "KUL", "jakarta": "CGK",
    "manila": "MNL", "ho chi minh": "SGN", "hanoi": "HAN", "cairo": "CAI",
    "casablanca": "CMN", "johannesburg": "JNB", "nairobi": "NBO", "lagos": "LOS",
    "sao paulo": "GRU", "rio de janeiro": "GIG", "buenos aires": "EZE",
    "santiago": "SCL", "mexico city": "MEX", "denver": "DEN", "seattle": "SEA",
    "atlanta": "ATL", "dallas": "DFW", "houston": "IAH", "las vegas": "LAS",
    "orlando": "MCO", "philadelphia": "PHL", "phoenix": "PHX", "portland": "PDX",
    "detroit": "DTW", "minneapolis": "MSP", "charlotte": "CLT", "tampa": "TPA",
    "nashville": "BNA", "austin": "AUS", "san diego": "SAN", "honolulu": "HNL",
    "osaka": "KIX", "kansai": "KIX", "fukuoka": "FUK", "nagoya": "NGO",
    "sapporo": "CTS", "taipei": "TPE", "taoyuan": "TPE",
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
    """Convert a city name or IATA code to uppercase IATA."""
    name = name.strip().lower()
    if len(name) == 3 and name.isalpha():
        return name.upper()
    if name in CITY_TO_IATA:
        return CITY_TO_IATA[name]
    for key, iata in CITY_TO_IATA.items():
        if name in key or key.startswith(name):
            return iata
    return name.upper() if len(name) == 3 else ""


def _resolve_date(text: str) -> str:
    """Parse date phrases into YYYY-MM-DD."""
    text = text.lower().strip()
    today = datetime.now()

    if "tomorrow" in text:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if "today" in text and text != "today":
        # Only match standalone "today" or "today" in context
        found = False
        for w in text.split():
            if w.strip(".,!?") == "today":
                found = True
                break
        if found and not any(w in text for w in ["today's", "todays"]):
            return today.strftime("%Y-%m-%d")
    if text == "today":
        return today.strftime("%Y-%m-%d")
    if "day after tomorrow" in text:
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")

    # "next [weekday]"
    m = re.search(r"next\s+(\w+)", text)
    if m:
        day_name = m.group(1)
        if day_name in WEEKDAYS:
            target = WEEKDAYS[day_name]
            days_ahead = (target - today.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # "this [weekday]"
    m = re.search(r"this\s+(\w+)", text)
    if m:
        day_name = m.group(1)
        if day_name in WEEKDAYS:
            target = WEEKDAYS[day_name]
            days_ahead = (target - today.weekday()) % 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # "in 2 days", "in 3 weeks"
    m = re.search(r"in\s+(\d+)\s+(day|days|week|weeks)", text)
    if m:
        num = int(m.group(1))
        unit = m.group(2)
        if "week" in unit:
            num *= 7
        return (today + timedelta(days=num)).strftime("%Y-%m-%d")

    # "July 15th", "15 July"
    m = re.search(r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?", text)
    if m:
        month_name = m.group(1).lower()
        day = int(m.group(2))
        if month_name in MONTH_NAMES:
            month = MONTH_NAMES[month_name]
            year = today.year
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
    """Extract price from free-form text."""
    m = re.search(r"(?:under|less than|budget of|max|up to|within|below)\s*\$?(\d{2,6})", text.lower())
    if m:
        return float(m.group(1))
    m = re.search(r"\$(\d{2,6})", text)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d{2,6})\s*(?:dollars|usd)", text.lower())
    if m:
        return float(m.group(1))
    return None


def _extract_passengers(text: str) -> int:
    """Extract number of passengers."""
    m = re.search(r"(\d+)\s*(?:passenger|passengers|person|people|traveler|travellers|adult|adults)", text.lower())
    if m:
        return max(1, int(m.group(1)))
    # "for two", "for three"
    number_map = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    m = re.search(r"(?:for|with)\s+(" + "|".join(number_map.keys()) + r")\b", text.lower())
    if m:
        return number_map[m.group(1)]
    return 1


def _check_flight_related(text: str) -> bool:
    """
    HARD WALL: Only allow flight booking related intents.
    Returns True if the text is about flight booking, False otherwise.
    """
    flight_keywords = [
        "flight", "fly", "flying", "plane", "airplane", "airport", "airline",
        "book", "booking", "trip", "travel", "going to", "journey",
        "destination", "departure", "arrive", "arriving",
        "from", "to ", "i want to go", "i need to go",
        "take me", "search", "find", "looking for",
        "cancel", "reschedule", "change my flight",
        "my trips", "my booking", "my history", "my flights",
        "portfolio", "how many flights", "total spent",
        "budget", "price", "cheap", "affordable",
        "ticket", "one way", "round trip", "business class",
        "economy", "first class",
        # IATA codes
        r"\b[A-Z]{3}\b",  # 3-letter airport codes
    ]

    text_lower = text.lower()

    # Always allow common IATA patterns
    iata_codes = re.findall(r'\b[A-Z]{3}\b', text)
    if iata_codes and len(iata_codes) >= 2:
        return True

    for keyword in flight_keywords:
        if keyword.startswith("r\"") and keyword.endswith("\""):
            # It's a regex pattern
            pattern = keyword[1:-1]  # Remove the r" and "
            if re.search(pattern, text):
                return True
        elif keyword in text_lower:
            return True

    # Check for city names
    for city in CITY_TO_IATA:
        if city in text_lower:
            return True

    return False


def _extract_cities(text: str) -> list:
    """Extract city names from text, returning IATA codes."""
    cities = []
    text_lower = text.lower()

    # First, try to find city names (longer matches first to avoid partial matches)
    for name, iata in sorted(CITY_TO_IATA.items(), key=lambda x: -len(x[0])):
        if name in text_lower:
            if iata not in cities:
                cities.append(iata)
                if len(cities) >= 2:
                    break

    # If we don't have 2 cities yet, look for IATA codes
    if len(cities) < 2:
        codes = re.findall(r'\b([A-Z]{3})\b', text)
        for c in codes:
            if c not in cities:
                cities.append(c)
                if len(cities) >= 2:
                    break

    return cities[:2]


# ── RESPONSE TEMPLATES (English — translated to user language) ─────

FLIGHT_RESPONSES = {
    "search": "Looking for flights{origin}{destination}{date}{price}.",
    "budget": "Searching for flights under ${price}{origin}{destination}{date}.",
    "cancel": "I'll help you cancel that booking.",
    "reschedule": "I'll look for reschedule options{date}.",
    "history": "Let me look up your flight history.",
    "portfolio": "Here are your travel statistics.",
    "help": "I can help you book flights, cancel or reschedule bookings, check your travel history, and find flights within your budget. Just tell me where you want to go!",
    "not_flight": "I can only help with flight booking. Please tell me about flights you'd like to book, cancel, or check.",
    "not_flight_short": "I'm a flight booking assistant. Please ask me about flights!",
    "unknown": "I didn't quite catch that. You can say something like 'Book a flight from New York to London' or 'Cancel my booking' or 'Show my trips'.",
}


class LLMOrchestrator:
    """Multilingual flight booking NLP parser with flight-only hard wall."""

    async def parse_command(self, text: str, context: dict = None) -> dict:
        """
        Parse natural language into a structured voice command.
        Supports ANY language — translates to English internally,
        responds in the user's original language.

        Returns: {"intent": "...", "parameters": {...}, "response_text": "..."}
        """
        original_text = text.strip()
        if not original_text:
            return {"intent": "help", "parameters": {}, "response_text": "Please tell me how I can help you with your flight booking."}

        # ── Step 1: Language detection ──────────────────────────
        user_lang = _detect_language(original_text)
        logger.info(f"Detected language: {user_lang}")

        # ── Step 2: Translate to English for parsing ────────────
        text_en = _translate_to_english(original_text, user_lang)
        text_lower = text_en.lower().strip()
        logger.info(f"English translation: {text_en}")

        # ── Step 3: Detect multi-turn intents (bypass hard wall) ──
        # These are checked BEFORE the flight-only hard wall because
        # they're part of a multi-turn conversation (selecting a flight,
        # providing name, confirming booking)

        is_select = any(w in text_lower for w in [
            "first", "first one", "first flight", "cheapest", "cheapest one",
            "select", "choose", "pick", "i'll take",
            "that one", "that flight", "number",
            "second", "third", "fourth", "fifth",
            "i want this", "i want that", "go with",
            "book the cheapest", "book the first", "book number",
        ])
        is_confirm = any(w in text_lower for w in [
            "yes", "yeah", "confirm", "proceed", "go ahead",
            "do it", "sure",
            "correct", "that's right",
            "please book", "yes please",
        ]) or re.search(r'\bok\b', text_lower) or re.search(r'\bokay\b', text_lower)
        is_provide_name = any(w in text_lower for w in [
            "my name is", "name is", "i am ", "this is ",
        ])

        # ── SELECT FLIGHT (caught before hard wall + search check) ──
        if is_select:
            position = "cheapest"
            if any(w in text_lower for w in ["first", "first one", "first flight"]):
                position = "first"
            elif any(w in text_lower for w in ["second"]):
                position = "second"
            elif any(w in text_lower for w in ["third"]):
                position = "third"
            elif any(w in text_lower for w in ["fourth"]):
                position = "fourth"
            elif any(w in text_lower for w in ["fifth"]):
                position = "fifth"
            elif any(w in text_lower for w in ["cheapest", "cheapest one", "cheap"]):
                position = "cheapest"

            num_match = re.search(r'(?:number|pick|select|option)\s+(\d+)', text_lower)
            if num_match:
                position = num_match.group(1)

            response_en = f"Selecting the {position} flight for you."
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en

            return {
                "intent": "select_flight",
                "parameters": {"position": str(position), "user_lang": user_lang},
                "response_text": response_text,
            }

        # ── CONFIRM ──
        if is_confirm:
            response_en = "Booking confirmed! Let me process that."
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en

            return {
                "intent": "confirm_booking",
                "parameters": {"confirmed": True, "user_lang": user_lang},
                "response_text": response_text,
            }

        # ── PROVIDE NAME ──
        if is_provide_name:
            name_match = re.search(r'(?:my name is|name is|i am |this is )(.+)', text_lower, re.IGNORECASE)
            name = name_match.group(1).strip().title() if name_match else text_en.strip().title()

            response_en = f"Got it, {name}."
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en

            return {
                "intent": "provide_name",
                "parameters": {"name": name, "user_lang": user_lang},
                "response_text": response_text,
            }

        # ── Step 4: HARD WALL — flight-only check for new conversations ──
        if not _check_flight_related(text_en):
            response_en = FLIGHT_RESPONSES["not_flight"]
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {
                "intent": "help",
                "parameters": {},
                "response_text": response_text,
            }

        # ── Step 5: Extract parameters ──────────────────────────

        # Detect intent
        is_help = any(w in text_lower for w in ["help", "what can you", "how does", "hello", "hi ", "what do you"])
        is_history = any(w in text_lower for w in ["history", "past flights", "my trips", "show my flights",
                                                     "flight history", "previous booking", "what i booked"])
        is_portfolio = any(w in text_lower for w in ["portfolio", "stats", "how many flights",
                                                      "total spent", "favorite route", "flight stats"])
        is_cancel = any(w in text_lower for w in ["cancel", "cancel my", "i want to cancel"])
        is_reschedule = any(w in text_lower for w in ["reschedule", "change my flight", "move my flight",
                                                       "change date", "different day"])
        is_search = any(w in text_lower for w in ["book", "flight", "fly", "flying", "travel", "going to",
                                                    "want to go", "find", "search", "trip", "take me",
                                                    "from", "to "])

        # Extract data
        max_price = _extract_price(text_lower)
        passengers = _extract_passengers(text_lower)
        departure_date = _resolve_date(text_lower)
        cities = _extract_cities(text_en)

        origin = cities[0] if len(cities) >= 1 else (context.get("origin") if context else "")
        destination = cities[1] if len(cities) >= 2 else (context.get("destination") if context else "")

        if not departure_date and context:
            departure_date = context.get("departure_date", "")

        # ── Step 5: Build response ──────────────────────────────

        # Store user language in parameters for later translation

        # ── SELECT FLIGHT (must be before is_search to avoid conflict) ──
        if is_select and not is_search:
            # Extract which flight they want (first, cheapest, or explicit number)
            position = "cheapest"
            if any(w in text_lower for w in ["first", "first one", "first flight"]):
                position = "first"
            elif any(w in text_lower for w in ["second"]):
                position = "second"
            elif any(w in text_lower for w in ["third"]):
                position = "third"
            elif any(w in text_lower for w in ["fourth"]):
                position = "fourth"
            elif any(w in text_lower for w in ["fifth"]):
                position = "fifth"
            elif any(w in text_lower for w in ["cheapest", "cheapest one", "cheap"]):
                position = "cheapest"

            # Extract number: "number 2", "pick 3", "select 4"
            num_match = re.search(r'(?:number|pick|select|option)\s+(\d+)', text_lower)
            if num_match:
                position = num_match.group(1)

            response_en = f"Selecting the {position} flight for you."
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en

            return {
                "intent": "select_flight",
                "parameters": {"position": str(position), "user_lang": user_lang},
                "response_text": response_text,
            }

        # HELP
        if is_help and not is_search and not is_cancel:
            response_en = FLIGHT_RESPONSES["help"]
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {"intent": "help", "parameters": {"user_lang": user_lang}, "response_text": response_text}

        # HISTORY
        if is_history:
            response_en = FLIGHT_RESPONSES["history"]
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {"intent": "view_history", "parameters": {"user_lang": user_lang}, "response_text": response_text}

        # PORTFOLIO
        if is_portfolio:
            response_en = FLIGHT_RESPONSES["portfolio"]
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {"intent": "view_portfolio", "parameters": {"user_lang": user_lang}, "response_text": response_text}

        # CANCEL
        if is_cancel:
            booking_id = context.get("session_id") if context else None
            response_en = FLIGHT_RESPONSES["cancel"]
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {
                "intent": "cancel_booking",
                "parameters": {"booking_id": booking_id or "latest"},
                "response_text": response_text,
            }

        # RESCHEDULE
        if is_reschedule:
            response_en = FLIGHT_RESPONSES["reschedule"].format(date=f" on {departure_date}" if departure_date else "")
            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en
            return {
                "intent": "reschedule_booking",
                "parameters": {"booking_id": "latest", "new_date": departure_date},
                "response_text": response_text,
            }

        # SEARCH FLIGHTS
        if is_search:
            params = {
                "origin": origin,
                "destination": destination,
                "date": departure_date,
                "max_price": max_price,
                "passengers": passengers,
            }

            origin_str = f" from {origin}" if origin else ""
            dest_str = f" to {destination}" if destination else ""
            date_str = f" on {departure_date}" if departure_date else ""
            price_str = f" under ${int(max_price)}" if max_price else ""

            if max_price:
                response_en = FLIGHT_RESPONSES["budget"].format(
                    price=int(max_price), origin=origin_str,
                    destination=dest_str, date=date_str
                )
                intent = "search_with_budget"
            else:
                response_en = FLIGHT_RESPONSES["search"].format(
                    origin=origin_str, destination=dest_str,
                    date=date_str, price=price_str
                )
                intent = "search_flights"

            if user_lang != "en":
                response_text = _translate_text(response_en, user_lang)
            else:
                response_text = response_en

            return {"intent": intent, "parameters": {**params, "user_lang": user_lang}, "response_text": response_text}

        # Fallback
        response_en = FLIGHT_RESPONSES["unknown"]
        if user_lang != "en":
            response_text = _translate_text(response_en, user_lang)
        else:
            response_text = response_en
        return {"intent": "help", "parameters": {"user_lang": user_lang}, "response_text": response_text}


llm = LLMOrchestrator()