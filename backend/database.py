"""
Wayfinder Backend — SQLite Database Setup
"""

import sqlite3
import os
from pathlib import Path

DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "wayfinder.db"


def get_db() -> sqlite3.Connection:
    """Get a SQLite connection with row factory."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()

    # Booking sessions (wizard state machine)
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            current_step TEXT NOT NULL DEFAULT 'origin',
            origin TEXT,
            origin_name TEXT,
            destination TEXT,
            destination_name TEXT,
            departure_date TEXT,
            departure_time TEXT,
            selected_offer_id TEXT,
            selected_flight_summary TEXT,
            passenger_id TEXT,
            passenger_name TEXT,
            passenger_assistance TEXT,
            booking_reference TEXT,
            low_confidence_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            user_id TEXT,
            duffel_order_id TEXT,
            status TEXT DEFAULT 'pending',
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            departure_date TEXT NOT NULL,
            flight_summary TEXT,
            passenger_name TEXT,
            passenger_assistance TEXT,
            total_amount TEXT,
            total_currency TEXT DEFAULT 'GBP',
            booking_reference TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS flight_offers (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            offer_data TEXT NOT NULL,
            selected INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        );

        CREATE TABLE IF NOT EXISTS cs_tickets (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            user_name TEXT DEFAULT 'Guest',
            issue TEXT DEFAULT '',
            status TEXT DEFAULT 'open',
            agent_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cs_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES cs_tickets(id)
        );
    """)
    conn.commit()

    # Add user_id column to existing bookings table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE bookings ADD COLUMN user_id TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists

    conn.close()


def get_session(session_id: str) -> dict | None:
    """Get a session by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_session(session_id: str) -> dict:
    """Create a new booking session."""
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, current_step) VALUES (?, ?)",
        (session_id, "origin"),
    )
    conn.commit()
    conn.close()
    return {"id": session_id, "current_step": "origin"}


def update_session(session_id: str, **kwargs):
    """Update session fields."""
    if not kwargs:
        return
    sets = ", ".join(f"{k} = ?" for k in kwargs.keys())
    vals = list(kwargs.values())
    conn = get_db()
    conn.execute(
        f"UPDATE sessions SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (*vals, session_id),
    )
    conn.commit()
    conn.close()


def save_booking(booking: dict) -> dict:
    """Save a completed booking."""
    conn = get_db()
    conn.execute(
        """INSERT INTO bookings
           (id, session_id, user_id, duffel_order_id, status, origin, destination,
            departure_date, flight_summary, passenger_name, passenger_assistance,
            total_amount, total_currency, booking_reference)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            booking["id"],
            booking["session_id"],
            booking.get("user_id"),
            booking.get("duffel_order_id"),
            booking.get("status", "confirmed"),
            booking["origin"],
            booking["destination"],
            booking["departure_date"],
            booking.get("flight_summary"),
            booking.get("passenger_name"),
            booking.get("passenger_assistance"),
            booking.get("total_amount"),
            booking.get("total_currency", "GBP"),
            booking.get("booking_reference"),
        ),
    )
    conn.commit()
    conn.close()
    return booking


def get_bookings(limit: int = 20) -> list[dict]:
    """Get recent bookings."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bookings ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_offer(session_id: str, offer_id: str, offer_data: dict):
    """Cache a flight offer for a session."""
    import json
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO flight_offers (id, session_id, offer_data) VALUES (?, ?, ?)",
        (offer_id, session_id, json.dumps(offer_data)),
    )
    conn.commit()
    conn.close()


def get_offers(session_id: str) -> list[dict]:
    """Get cached offers for a session."""
    import json
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM flight_offers WHERE session_id = ? ORDER BY created_at DESC",
        (session_id,),
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["offer_data"] = json.loads(d["offer_data"])
        result.append(d)
    return result


# ── User Bookings ────────────────────────────────────────────


def get_bookings_by_user(user_id: str) -> list[dict]:
    """Get all bookings for a user."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_portfolio_stats(user_id: str) -> dict:
    """
    Get portfolio statistics for a user.
    Returns: total_bookings, total_spent, favorite_route, upcoming_trips,
             cancelled_count, total_by_airline
    """
    conn = get_db()
    cursor = conn.cursor()

    # Total bookings
    cursor.execute(
        "SELECT COUNT(*) as total FROM bookings WHERE user_id = ?",
        (user_id,),
    )
    total_bookings = cursor.fetchone()["total"]

    # Total spent (sum of total_amount where status != 'cancelled')
    cursor.execute(
        "SELECT SUM(CAST(total_amount AS REAL)) as total FROM bookings "
        "WHERE user_id = ? AND status != 'cancelled'",
        (user_id,),
    )
    row = cursor.fetchone()
    total_spent = row["total"] if row["total"] else 0.0

    # Cancelled count
    cursor.execute(
        "SELECT COUNT(*) as total FROM bookings "
        "WHERE user_id = ? AND status = 'cancelled'",
        (user_id,),
    )
    cancelled_count = cursor.fetchone()["total"]

    # Favorite route (most frequent origin -> destination)
    cursor.execute(
        "SELECT origin, destination, COUNT(*) as cnt FROM bookings "
        "WHERE user_id = ? "
        "GROUP BY origin, destination ORDER BY cnt DESC LIMIT 1",
        (user_id,),
    )
    fav = cursor.fetchone()
    favorite_route = f"{fav['origin']} -> {fav['destination']}" if fav else ""

    # Upcoming trips (future bookings with status 'confirmed')
    from datetime import date
    today = date.today().isoformat()
    cursor.execute(
        "SELECT * FROM bookings "
        "WHERE user_id = ? AND departure_date >= ? AND status = 'confirmed' "
        "ORDER BY departure_date ASC",
        (user_id, today),
    )
    upcoming_trips = [dict(r) for r in cursor.fetchall()]

    # Total by airline (from flight_summary patterns, best effort)
    cursor.execute(
        "SELECT flight_summary, COUNT(*) as cnt FROM bookings "
        "WHERE user_id = ? AND flight_summary IS NOT NULL "
        "GROUP BY flight_summary ORDER BY cnt DESC",
        (user_id,),
    )
    total_by_airline = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "total_bookings": total_bookings,
        "total_spent": f"{total_spent:.2f}",
        "favorite_route": favorite_route,
        "upcoming_trips": upcoming_trips,
        "cancelled_count": cancelled_count,
        "total_by_airline": total_by_airline,
    }


def update_booking_status(booking_id: str, status: str, **kwargs):
    """
    Update booking status and optional fields.
    Args:
        booking_id: The local booking ID.
        status: New status (e.g. 'cancelled', 'rescheduled', 'confirmed').
        **kwargs: Additional fields to update (e.g. duffel_order_id, booking_reference).
    """
    sets = ["status = ?"]
    vals = [status]
    for k, v in kwargs.items():
        sets.append(f"{k} = ?")
        vals.append(v)
    vals.append(booking_id)
    conn = get_db()
    conn.execute(
        f"UPDATE bookings SET {', '.join(sets)} WHERE id = ?",
        vals,
    )
    conn.commit()
    conn.close()


# ═══════════════════════════════════════════════════════════════════
# CS DASHBOARD — Tickets & Agent Messaging
# ═══════════════════════════════════════════════════════════════════


def create_cs_ticket(ticket_id: str, session_id: str = "", user_name: str = "Guest", issue: str = "") -> dict:
    """Create a new CS ticket."""
    conn = get_db()
    conn.execute(
        "INSERT INTO cs_tickets (id, session_id, user_name, issue) VALUES (?, ?, ?, ?)",
        (ticket_id, session_id, user_name, issue),
    )
    conn.commit()
    conn.close()
    return {"id": ticket_id, "session_id": session_id, "user_name": user_name, "issue": issue, "status": "open"}


def get_cs_tickets(status: str = "") -> list[dict]:
    """Get CS tickets, optionally filtered by status."""
    conn = get_db()
    if status:
        rows = conn.execute(
            "SELECT * FROM cs_tickets WHERE status = ? ORDER BY created_at DESC", (status,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM cs_tickets ORDER BY created_at DESC"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_cs_ticket(ticket_id: str) -> dict | None:
    """Get a single CS ticket by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM cs_tickets WHERE id = ?", (ticket_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_cs_ticket(ticket_id: str, **kwargs):
    """Update CS ticket fields (status, agent_id, etc.)."""
    if not kwargs:
        return
    sets = ", ".join(f"{k} = ?" for k in kwargs.keys())
    vals = list(kwargs.values())
    vals.append(ticket_id)
    conn = get_db()
    conn.execute(
        f"UPDATE cs_tickets SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        vals,
    )
    conn.commit()
    conn.close()


def add_cs_message(ticket_id: str, sender: str, message: str) -> dict:
    """Add a message to a CS ticket conversation."""
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO cs_messages (ticket_id, sender, message) VALUES (?, ?, ?)",
        (ticket_id, sender, message),
    )
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": msg_id, "ticket_id": ticket_id, "sender": sender, "message": message}


def get_cs_messages(ticket_id: str) -> list[dict]:
    """Get all messages for a CS ticket."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM cs_messages WHERE ticket_id = ? ORDER BY created_at ASC",
        (ticket_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
