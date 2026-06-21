"""
Wayfinder Backend — Shared Helpers
Consolidated date parsing, IATA resolution, translation, and retry logic.
Avoids duplication across voice.py, llm_orchestrator.py, and other modules.
"""

import re
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from airport_data import search_airports, get_airport

logger = logging.getLogger("wayfinder.helpers")

# ── Date Parsing ─────────────────────────────────────────────────────

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


def resolve_date(text: str) -> str:
    """
    Convert natural language date phrases to YYYY-MM-DD.
    Handles: today, tomorrow, day after tomorrow, next X, this X,
    July 15th, 15 July, MM/DD, MM/DD/YYYY, YYYY-MM-DD, in N days.
    Returns empty string if no date found.
    """
    if not text or not text.strip():
        return ""
    lowered = text.strip().lower()
    today = date.today()

    # Relative dates
    if lowered in ("today",):
        return today.isoformat()
    if lowered in ("tomorrow",):
        return (today + timedelta(days=1)).isoformat()
    if "day after tomorrow" in lowered:
        return (today + timedelta(days=2)).isoformat()

    # "next [weekday]" or "this [weekday]"
    for prefix in ("next", "this"):
        m = re.search(rf"{prefix}\s+(\w+)", lowered)
        if m and m.group(1) in WEEKDAYS:
            target = WEEKDAYS[m.group(1)]
            days_ahead = (target - today.weekday()) % 7
            if prefix == "next" and days_ahead == 0:
                days_ahead = 7
            return (today + timedelta(days=days_ahead)).isoformat()

    # "in N days" / "in N weeks"
    m = re.search(r"in\s+(\d+)\s+(day|days|week|weeks)", lowered)
    if m:
        num = int(m.group(1))
        if "week" in m.group(2):
            num *= 7
        return (today + timedelta(days=num)).isoformat()

    # "July 15th" / "15 July"
    m = re.search(r"(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?", lowered)
    if m:
        month_name = m.group(1).lower()
        day = int(m.group(2))
        if month_name in MONTH_NAMES:
            month = MONTH_NAMES[month_name]
            year = today.year
            test_date = date(year, month, day)
            if test_date < today:
                test_date = date(year + 1, month, day)
            return test_date.isoformat()

    # "MM/DD" or "MM/DD/YYYY"
    m = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{4}))?", lowered)
    if m:
        month, day = int(m.group(1)), int(m.group(2))
        year = int(m.group(3)) if m.group(3) else today.year
        return f"{year}-{month:02d}-{day:02d}"

    # "YYYY-MM-DD"
    m = re.search(r"(\d{4}-\d{2}-\d{2})", lowered)
    if m:
        return m.group(1)

    return ""


# ── IATA Resolution ─────────────────────────────────────────────────

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
    # Country names → primary international airports
    "japan": "NRT", "india": "DEL", "china": "PEK", "thailand": "BKK",
    "vietnam": "SGN", "south korea": "ICN", "korea": "ICN",
    "united kingdom": "LHR", "uk": "LHR", "england": "LHR",
    "france": "CDG", "germany": "FRA", "italy": "FCO",
    "spain": "MAD", "netherlands": "AMS", "switzerland": "ZRH",
    "australia": "SYD", "brazil": "GRU", "canada": "YYZ",
    "united arab emirates": "DXB", "uae": "DXB", "qatar": "DOH",
    "turkey": "IST", "egypt": "CAI", "south africa": "JNB",
    "russia": "SVO", "mexico": "MEX", "argentina": "EZE",
}


def resolve_iata(city_or_code: str) -> str:
    """
    Resolve a city name, IATA code, or partial name to an IATA code.
    Checks: local airport DB → city name map → fuzzy search.
    Returns empty string if nothing found.
    """
    if not city_or_code or not city_or_code.strip():
        return ""
    code = city_or_code.strip().upper()

    # If it's already a valid 3-letter IATA code
    if len(code) == 3 and get_airport(code):
        return code

    # Check the city name map
    lowered = city_or_code.strip().lower()
    if lowered in CITY_TO_IATA:
        return CITY_TO_IATA[lowered]
    for key, iata in CITY_TO_IATA.items():
        if lowered in key or key.startswith(lowered) or lowered.startswith(key):
            return iata

    # Fuzzy search via airport DB
    results = search_airports(city_or_code, limit=5)
    if results:
        return results[0]["iata"]

    # Last resort — return as-is (might be a raw IATA code)
    return code if len(code) == 3 else ""


def extract_cities(text: str) -> list:
    """
    Extract up to 2 city IATA codes from natural language text.
    Checks city names first (longer matches), then raw IATA codes.
    """
    if not text:
        return []
    cities = []
    text_lower = text.lower()

    # Try city names (longest matches first to avoid partial matches)
    for name, iata in sorted(CITY_TO_IATA.items(), key=lambda x: -len(x[0])):
        if name in text_lower:
            if iata not in cities:
                cities.append(iata)
                if len(cities) >= 2:
                    break

    # Fallback: IATA codes as raw uppercase 3-letter tokens
    if len(cities) < 2:
        codes = re.findall(r'\b([A-Z]{3})\b', text)
        for c in codes:
            if c not in cities and get_airport(c):
                cities.append(c)
                if len(cities) >= 2:
                    break

    return cities[:2]


# ── Translation ─────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    """Detect the language of input text. Returns ISO code or 'en'."""
    try:
        from langdetect import detect
        return detect(text) if text.strip() else "en"
    except Exception:
        return "en"


def translate_to_english(text: str, source_lang: str = "") -> str:
    """Translate text to English using Google Translate (free)."""
    if not text or source_lang == "en" or not source_lang:
        return text
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source=source_lang, target="en").translate(text)
    except Exception as e:
        logger.warning(f"Translation to English failed: {e}")
        return text


def translate_text(text: str, target_lang: str) -> str:
    """Translate text from English to target language."""
    if not text or not target_lang or target_lang == "en":
        return text
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="en", target=target_lang).translate(text)
    except Exception as e:
        logger.warning(f"Translation to {target_lang} failed: {e}")
        return text


# ── Price / Passenger Extraction ────────────────────────────────────

def extract_price(text: str) -> Optional[float]:
    """Extract price from free-form text like 'under $400'."""
    if not text:
        return None
    lowered = text.lower()
    m = re.search(r"(?:under|less than|budget of|max|up to|within|below)\s*\$?(\d{2,6})", lowered)
    if m:
        return float(m.group(1))
    m = re.search(r"\$(\d{2,6})", lowered)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d{2,6})\s*(?:dollars|usd)", lowered)
    if m:
        return float(m.group(1))
    return None


def extract_passengers(text: str) -> int:
    """Extract number of passengers from text."""
    if not text:
        return 1
    m = re.search(r"(\d+)\s*(?:passenger|passengers|person|people|traveler|travellers|adult|adults)", text.lower())
    if m:
        return max(1, int(m.group(1)))
    number_map = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
    m = re.search(r"(?:for|with)\s+(" + "|".join(number_map.keys()) + r")\b", text.lower())
    if m:
        return number_map[m.group(1)]
    return 1
