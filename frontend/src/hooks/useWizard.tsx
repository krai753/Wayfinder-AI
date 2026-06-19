/**
 * useWizard — global React Context for booking session state.
 *
 * Holds:
 * - session_id (returned by /api/wizard/session)
 * - origin / destination / date
 * - selected flight offer
 * - passenger details
 * - last search results
 *
 * Screens read & write this state; navigation is driven by App.tsx
 * (which calls advance()/back()) and by the wizard's natural flow.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from "react";
import type { FlightOffer, AirportResult } from "../types";
import { api } from "../services/api";

interface WizardState {
  sessionId: string | null;
  origin: AirportResult | null;
  destination: AirportResult | null;
  departureDate: string | null; // YYYY-MM-DD
  offers: FlightOffer[];
  cheapestOffer: FlightOffer | null;
  selectedOffer: FlightOffer | null;
  passengerName: string;
  passengerAssistance: "none" | "wheelchair" | "visual";
  loading: boolean;
  error: string | null;
}

interface WizardContextValue extends WizardState {
  setOrigin: (a: AirportResult) => void;
  setDestination: (a: AirportResult) => void;
  swapOriginDestination: () => void;
  setDepartureDate: (d: string) => void;
  setSelectedOffer: (o: FlightOffer) => void;
  setPassengerName: (n: string) => void;
  setPassengerAssistance: (a: WizardState["passengerAssistance"]) => void;
  startSession: () => Promise<string>;
  searchFlights: () => Promise<FlightOffer[]>;
  reset: () => void;
}

const INITIAL: WizardState = {
  sessionId: null,
  origin: null,
  destination: null,
  departureDate: null,
  offers: [],
  cheapestOffer: null,
  selectedOffer: null,
  passengerName: "",
  passengerAssistance: "none",
  loading: false,
  error: null,
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(INITIAL);

  // Persist critical state to sessionStorage so refresh doesn't lose it
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wayfinder.wizard");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setState((prev) => ({ ...prev, ...parsed, loading: false, error: null }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const toSave = { ...state, loading: false, error: null };
      sessionStorage.setItem("wayfinder.wizard", JSON.stringify(toSave));
    } catch {}
  }, [state]);

  const setOrigin = useCallback((a: AirportResult) => {
    setState((s) => ({ ...s, origin: a, selectedOffer: null, offers: [], cheapestOffer: null }));
  }, []);

  const setDestination = useCallback((a: AirportResult) => {
    setState((s) => ({ ...s, destination: a, selectedOffer: null, offers: [], cheapestOffer: null }));
  }, []);

  const swapOriginDestination = useCallback(() => {
    setState((s) => ({ ...s, origin: s.destination, destination: s.origin }));
  }, []);

  const setDepartureDate = useCallback((d: string) => {
    setState((s) => ({ ...s, departureDate: d, selectedOffer: null, offers: [], cheapestOffer: null }));
  }, []);

  const setSelectedOffer = useCallback((o: FlightOffer) => {
    setState((s) => ({ ...s, selectedOffer: o }));
  }, []);

  const setPassengerName = useCallback((n: string) => {
    setState((s) => ({ ...s, passengerName: n }));
  }, []);

  const setPassengerAssistance = useCallback(
    (a: WizardState["passengerAssistance"]) => {
      setState((s) => ({ ...s, passengerAssistance: a }));
    },
    []
  );

  const startSession = useCallback(async (): Promise<string> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.startWizard();
      setState((s) => ({ ...s, sessionId: res.session_id, loading: false }));
      return res.session_id;
    } catch (e: any) {
      // Fallback: generate a local id so the UI can still proceed
      const fallback = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setState((s) => ({ ...s, sessionId: fallback, loading: false }));
      return fallback;
    }
  }, []);

  const searchFlights = useCallback(async (): Promise<FlightOffer[]> => {
    if (!state.origin || !state.destination || !state.departureDate) {
      throw new Error("Missing origin, destination, or date");
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.searchFlights(
        state.origin.iata,
        state.destination.iata,
        state.departureDate
      );
      const offers = (res.offers || []).slice().sort(
        (a, b) => parseFloat(a.price || "0") - parseFloat(b.price || "0")
      );
      const cheapest = offers[0] ?? null;
      setState((s) => ({ ...s, offers, cheapestOffer: cheapest, loading: false }));
      return offers;
    } catch (e: any) {
      const msg = e?.message ?? "Search failed";
      setState((s) => ({ ...s, loading: false, error: msg }));
      throw e;
    }
  }, [state.origin, state.destination, state.departureDate]);

  const reset = useCallback(() => {
    setState(INITIAL);
    try {
      sessionStorage.removeItem("wayfinder.wizard");
    } catch {}
  }, []);

  const value = useMemo<WizardContextValue>(
    () => ({
      ...state,
      setOrigin,
      setDestination,
      swapOriginDestination,
      setDepartureDate,
      setSelectedOffer,
      setPassengerName,
      setPassengerAssistance,
      startSession,
      searchFlights,
      reset,
    }),
    [
      state,
      setOrigin,
      setDestination,
      swapOriginDestination,
      setDepartureDate,
      setSelectedOffer,
      setPassengerName,
      setPassengerAssistance,
      startSession,
      searchFlights,
      reset,
    ]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used inside <WizardProvider>");
  }
  return ctx;
}
