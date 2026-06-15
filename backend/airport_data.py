"""
Wayfinder Backend — Embedded Real IATA Airport Database
Sources: OpenFlights airports.dat (CC-BY-SA)
"""

import csv
import os
from pathlib import Path

AIRPORTS_DATA_PATH = Path(__file__).parent / "airports_raw.dat"

# In-memory airport index: {iata: {name, city, country, tz}, ...}
_airports_by_iata: dict[str, dict] = {}
_airports_list: list[dict] = []


def _load_airports():
    """Load airports from the raw OpenFlights dataset."""
    global _airports_by_iata, _airports_list

    if _airports_by_iata:
        return  # Already loaded

    path = str(AIRPORTS_DATA_PATH)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Airport data not found at {path}")

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 9:
                continue
            iata = row[4].strip()
            if iata == "\\N" or iata == "":
                continue  # No valid IATA code

            airport = {
                "iata": iata,
                "name": row[1].strip().strip('"'),
                "city": row[2].strip().strip('"'),
                "country": row[3].strip().strip('"'),
                "tz": row[9].strip() if len(row) > 9 else "",
            }
            _airports_by_iata[iata] = airport
            _airports_list.append(airport)

    print(f"[airport_data] Loaded {len(_airports_by_iata)} IATA airports")


def search_airports(query: str, limit: int = 10) -> list[dict]:
    """
    Fuzzy search airports by IATA code, city name, or airport name.
    Returns up to `limit` results sorted by relevance.
    """
    _load_airports()
    q = query.strip().lower()
    if not q:
        return []

    scored = []

    for apt in _airports_list:
        score = 0
        iata_lower = apt["iata"].lower()
        city_lower = apt["city"].lower()
        name_lower = apt["name"].lower()

        # Exact IATA match (highest)
        if iata_lower == q:
            score = 1000
        # IATA prefix match
        elif iata_lower.startswith(q):
            score = 900
        # Exact city match
        elif city_lower == q:
            score = 800
        # City starts with query
        elif city_lower.startswith(q):
            score = 700 - len(city_lower) * 2  # shorter city names rank higher
        # City contains query
        elif q in city_lower:
            score = 400
        # Name contains query
        elif q in name_lower:
            score = 200
        # Partial city match (token-based)
        elif any(token.startswith(q) for token in city_lower.split()):
            score = 300
        else:
            continue

        scored.append((score, apt))

    # Sort by score descending
    scored.sort(key=lambda x: -x[0])
    return [apt for _, apt in scored[:limit]]


def get_airport(iata: str) -> dict | None:
    """Get a single airport by IATA code."""
    _load_airports()
    return _airports_by_iata.get(iata.upper())