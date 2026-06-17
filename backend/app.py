"""
Wayfinder AI — Backend Server
Voice-first accessible flight booking powered by Duffel API

Run with:  uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db
from duffel_client import duffel
from airport_data import search_airports  # triggers load on first call

# Routers
from routers import search as search_router
from routers import booking as booking_router
from routers import wizard as wizard_router
from routers import manage as manage_router
from routers import voice as voice_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wayfinder")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown hooks."""
    logger.info("🚀 Wayfinder AI backend starting...")
    logger.info(f"🔑 Duffel API: {'Configured' if settings.duffel_api_token else 'MISSING'}")

    # Init database
    init_db()
    logger.info("✅ Database initialized")

    # Warm up airport cache
    _ = search_airports("lon")
    logger.info("✅ Airport data loaded")

    yield

    # Shutdown
    await duffel.close()
    logger.info("👋 Wayfinder backend stopped")


app = FastAPI(
    title="Wayfinder AI",
    description="Voice-first accessible flight booking API — powered by Duffel",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow any origin for hackathon/demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(search_router.router)
app.include_router(booking_router.router)
app.include_router(wizard_router.router)
app.include_router(manage_router.router)
app.include_router(voice_router.router)


@app.get("/")
async def root():
    """Health check and API overview."""
    return {
        "app": "Wayfinder AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "airport_search": "GET /api/airports?q=...",
            "airport_detail": "GET /api/airports/{iata}",
            "flight_search": "POST /api/flights/search",
            "offer_detail": "GET /api/flights/offers/{offer_id}",
            "wizard_start": "POST /api/wizard/session",
            "wizard_step": "POST /api/wizard/step",
            "wizard_flights_search": "POST /api/wizard/flights/search?session_id=...",
            "wizard_flights_select": "POST /api/wizard/flights/select",
            "wizard_passenger": "POST /api/wizard/passenger",
            "create_booking": "POST /api/booking/create",
            "get_booking": "GET /api/booking/{order_id}",
            "list_bookings": "GET /api/bookings",
            "cancel_booking": "POST /api/booking/{booking_id}/cancel",
            "confirm_cancellation": "POST /api/booking/{booking_id}/cancel/confirm",
            "reschedule_search": "POST /api/booking/{booking_id}/reschedule/search?new_date=...",
            "reschedule_confirm": "POST /api/booking/{booking_id}/reschedule/confirm?change_offer_id=...",
            "flight_history": "GET /api/user/{user_id}/history",
            "flight_portfolio": "GET /api/user/{user_id}/portfolio",
            "budget_search": "GET /api/flights/budget?origin=...&destination=...&max_price=...",
            "voice_command": "POST /api/voice/command",
            "voice_speak": "POST /api/voice/speak?text=...",
            "voice_listen": "POST /api/voice/listen (multipart audio upload)",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )