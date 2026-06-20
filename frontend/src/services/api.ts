/**
 * Wayfinder AI — Backend API Service
 * All 22 endpoints typed and ready for frontend screens to import.
 *
 * Usage: import { api } from "../services/api";
 *        const offers = await api.searchFlights("JFK", "LHR", "2026-07-15");
 */

import type {
  AirportResult,
  FlightOffer,
  FlightSearchResult,
  BudgetSearchResult,
  WizardSession,
  BookingResult,
  HistoryResult,
  PortfolioResult,
  CancelResult,
  RescheduleResult,
  VoiceCommandResult,
  VoiceListenResult,
  ApiError,
} from "../types";

// Change this to your backend URL in production
const BASE = "/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  // Handle binary responses (voice/speak returns MP3)
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("audio") || ct.includes("octet-stream")) {
    return res.blob() as any;
  }

  return res.json();
}

export const api = {
  // ── 🛫 Airport Search ────────────────────────────────────────

  /** Search airports by name, city, or IATA code */
  searchAirports(q: string): Promise<{ query: string; count: number; airports: AirportResult[] }> {
    return request(`/airports?q=${encodeURIComponent(q)}`);
  },

  /** Get a single airport by IATA code */
  getAirport(iata: string): Promise<AirportResult> {
    return request(`/airports/${iata}`);
  },

  // ── ✈️ Flight Search ─────────────────────────────────────────

  /** Search flights via Duffel API */
  searchFlights(
    origin: string,
    destination: string,
    departure_date: string,
    passengers = 1,
    cabin_class = "economy"
  ): Promise<FlightSearchResult> {
    return request("/flights/search", {
      method: "POST",
      body: JSON.stringify({ origin, destination, departure_date, passengers, cabin_class }),
    });
  },

  /** Get a specific flight offer by ID */
  getOffer(offerId: string): Promise<any> {
    return request(`/flights/offers/${offerId}`);
  },

  /** Search flights within a budget (max price filter) */
  budgetSearch(
    origin: string,
    destination: string,
    departure_date: string,
    max_price: number,
    passengers = 1
  ): Promise<BudgetSearchResult> {
    const params = new URLSearchParams({
      origin,
      destination,
      departure_date,
      max_price: String(max_price),
      passengers: String(passengers),
    });
    return request(`/flights/budget?${params}`);
  },

  // ── 🧙 Booking Wizard ────────────────────────────────────────

  /** Start a new wizard session */
  startWizard(sessionId?: string): Promise<{ session_id: string; current_step: string; message: string }> {
    return request("/wizard/session", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  /** Get wizard session state */
  getWizardSession(sessionId: string): Promise<WizardSession> {
    return request(`/wizard/session/${sessionId}`);
  },

  /** Advance wizard to next step */
  wizardStep(sessionId: string, step: string, data: Record<string, any>): Promise<any> {
    return request("/wizard/step", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, step, data }),
    });
  },

  /** Search flights within an active wizard session */
  wizardSearchFlights(sessionId: string): Promise<{ session_id: string; offer_count: number; offers: FlightOffer[] }> {
    return request(`/wizard/flights/search?session_id=${encodeURIComponent(sessionId)}`, {
      method: "POST",
    });
  },

  /** Select a flight offer in the wizard */
  wizardSelectFlight(sessionId: string, offerId: string): Promise<any> {
    return request("/wizard/flights/select", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, offer_id: offerId }),
    });
  },

  /** Set passenger name + assistance needs */
  wizardPassenger(sessionId: string, name: string, assistance = "none"): Promise<any> {
    return request("/wizard/passenger", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, name, assistance }),
    });
  },

  // ── 📋 Booking ────────────────────────────────────────────────

  /** Create a booking from wizard session data */
  createBooking(sessionId: string): Promise<BookingResult> {
    return request("/booking/create", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  /** Get Duffel order details by order ID */
  getBooking(orderId: string): Promise<any> {
    return request(`/booking/${orderId}`);
  },

  /** List all recent bookings */
  listBookings(limit = 20): Promise<{ count: number; bookings: BookingResult[] }> {
    return request(`/bookings?limit=${limit}`);
  },

  // ── ❌ Cancel ─────────────────────────────────────────────────

  /** Initiate booking cancellation (step 1 — shows refund amount) */
  cancelBooking(bookingId: string): Promise<CancelResult> {
    return request(`/booking/${bookingId}/cancel`, { method: "POST" });
  },

  /** Confirm cancellation (step 2 — finalizes refund) */
  confirmCancellation(bookingId: string, cancellationId: string): Promise<any> {
    return request(`/booking/${bookingId}/cancel/confirm`, {
      method: "POST",
      body: JSON.stringify({ cancellation_id: cancellationId }),
    });
  },

  // ── 📅 Reschedule ─────────────────────────────────────────────

  /** Search reschedule options for a new date */
  rescheduleSearch(bookingId: string, newDate: string): Promise<RescheduleResult> {
    return request(
      `/booking/${bookingId}/reschedule/search?new_date=${encodeURIComponent(newDate)}`,
      { method: "POST" }
    );
  },

  /** Confirm reschedule with a selected change offer */
  rescheduleConfirm(bookingId: string, changeOfferId: string): Promise<any> {
    return request(
      `/booking/${bookingId}/reschedule/confirm?change_offer_id=${encodeURIComponent(changeOfferId)}`,
      { method: "POST" }
    );
  },

  // ── 📜 History & Portfolio ────────────────────────────────────

  /** Get flight history for a user */
  getHistory(userId: string, limit = 20): Promise<HistoryResult> {
    return request(`/user/${encodeURIComponent(userId)}/history?limit=${limit}`);
  },

  /** Get flight portfolio stats for a user */
  getPortfolio(userId: string): Promise<PortfolioResult> {
    return request(`/user/${encodeURIComponent(userId)}/portfolio`);
  },

  // ── 🗣️ Voice ──────────────────────────────────────────────────

  /** Process a natural language voice command */
  voiceCommand(text: string, sessionId?: string): Promise<VoiceCommandResult> {
    return request("/voice/command", {
      method: "POST",
      body: JSON.stringify({ text, session_id: sessionId }),
    });
  },

  /** Convert text to speech (returns MP3 blob) */
  async speak(text: string): Promise<Blob> {
    return request(`/voice/speak?text=${encodeURIComponent(text)}`);
  },

  /** Upload audio file for transcription */
  async listen(audioBlob: Blob, filename = "recording.webm"): Promise<VoiceListenResult> {
    const formData = new FormData();
    formData.append("audio", audioBlob, filename);
    const res = await fetch(`${BASE}/voice/listen`, { method: "POST", body: formData });
    if (!res.ok) throw new Error((await res.json()).detail || "STT failed");
    return res.json();
  },

  /** Escalate to customer service */
  async csEscalate(sessionId = "", issue = ""): Promise<Record<string, any>> {
    const res = await fetch(
      `${BASE}/voice/cs-escalate?session_id=${encodeURIComponent(sessionId)}&issue=${encodeURIComponent(issue)}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("CS escalation failed");
    return res.json();
  },

  // ── ❤️ Health Check ───────────────────────────────────────────

  /** Check if backend is alive */
  async health(): Promise<{ status: string }> {
    const res = await fetch(`${BASE.replace("/api", "")}/health`);
    if (!res.ok) throw new Error("Backend unreachable");
    return res.json();
  },
};