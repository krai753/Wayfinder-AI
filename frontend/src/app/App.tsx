import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic, MicOff, X, ArrowRight, ArrowLeft, Search, MapPin,
  Calendar, Plane, Clock, Users, Star, ChevronRight,
  ChevronDown, Check, Shield, CreditCard, Download,
  Share2, Bell, Settings, User, Home, Bookmark,
  MessageSquare, Wifi, Zap, Eye, EarOff, Activity,
  Volume2, Navigation, Filter, SortAsc, Luggage,
  Phone, Mail, AlertCircle, CheckCircle, Headphones,
  Globe, Moon, Lock, ChevronUp, Plus, Minus,
  RefreshCw, Coffee, Accessibility, Heart, Info
} from "lucide-react";

// Screens
import VoiceScreen from "../components/screens/VoiceScreen";
import ResultsScreen from "../components/screens/ResultsScreen";
import PassengerScreen from "../components/screens/PassengerScreen";
import ConfirmScreen from "../components/screens/ConfirmScreen";
import SuccessScreen from "../components/screens/SuccessScreen";
import TripsScreen from "../components/screens/TripsScreen";
import TripDetailScreen from "../components/screens/TripDetailScreen";
import CancelScreen from "../components/screens/CancelScreen";
import RescheduleScreen from "../components/screens/RescheduleScreen";
import PortfolioScreen from "../components/screens/PortfolioScreen";
import CSDashboard from "../components/screens/CSDashboard";

import type { FlightOffer, BookingResult } from "../types";
import { api } from "../services/api";
import CSCallHandler from "../components/screens/CSCallScreen";

// ── SCREEN TYPES ────────────────────────────────────────────────

type Screen =
  | "splash" | "home"
  | "voice" | "results" | "passenger" | "confirm" | "success"
  | "bookings" | "tripDetail" | "cancel" | "reschedule" | "portfolio"
  | "profile" | "cs_dashboard";

// ── SHARED SCREEN STATE ─────────────────────────────────────────

interface ScreenState {
  sessionId: string;
  offers: FlightOffer[];
  selectedFlight: FlightOffer | null;
  searchOrigin: string;
  searchDestination: string;
  searchDate: string;
  passengerName: string;
  passengerAssistance: string;
  bookingResult: BookingResult | null;
  selectedBooking: BookingResult | null;
  rescheduleBookingId: string;
  rescheduleCurrentDate: string;
  cancelBookingId: string;
}

// ── UI COMPONENTS ───────────────────────────────────────────────

function GlassCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/8 backdrop-blur-xl ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
      style={{ background: "rgba(21,28,47,0.7)" }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = "", disabled = false, icon }: {
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 focus:ring-offset-[#0B1020] disabled:opacity-40 ${className}`}
      style={{ background: disabled ? "#2D3B55" : "linear-gradient(135deg,#4F46E5,#6366f1)" }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

function Badge({ children, color = "indigo" }: { children: React.ReactNode; color?: "indigo" | "green" | "amber" | "red" | "blue" }) {
  const styles: Record<string, string> = {
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    red: "bg-red-500/15 text-red-300 border-red-500/20",
    blue: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}

function VoiceWave({ active, size = "md" }: { active: boolean; size?: "sm" | "md" | "lg" }) {
  const bars = size === "lg" ? 9 : size === "md" ? 7 : 5;
  const heights = [30, 50, 70, 90, 100, 90, 70, 50, 30];
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: size === "lg" ? 5 : size === "md" ? 4 : 3,
            background: active ? "linear-gradient(180deg,#4F46E5,#22C55E)" : "rgba(255,255,255,0.2)",
          }}
          animate={active ? {
            height: [heights[i] * 0.3, heights[i], heights[i] * 0.5, heights[i] * 0.8, heights[i] * 0.3],
          } : { height: size === "lg" ? 8 : 6 }}
          transition={active ? {
            duration: 0.8 + i * 0.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

function MicButton({ size = "lg", active = false, onClick }: { size?: "sm" | "md" | "lg" | "xl" | "2xl"; active?: boolean; onClick?: (e?: React.MouseEvent) => void }) {
  const dims: Record<string, string> = { sm: "w-14 h-14", md: "w-20 h-20", lg: "w-28 h-28", xl: "w-36 h-36", "2xl": "w-44 h-44" };
  const iconSize: Record<string, number> = { sm: 20, md: 28, lg: 44, xl: 52, "2xl": 64 };
  return (
    <motion.button
      onClick={onClick}
      className={`relative ${dims[size]} rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50`}
      whileTap={{ scale: 0.92 }}
    >
      {active && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(79,70,229,0.15)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: active ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "linear-gradient(135deg,rgba(79,70,229,0.25),rgba(99,102,241,0.15))",
          border: "2px solid rgba(79,70,229,0.4)",
          boxShadow: active ? "0 0 40px rgba(79,70,229,0.5)" : "0 0 20px rgba(79,70,229,0.2)",
        }}
      >
        {active ? <MicOff size={iconSize[size]} color="#fff" /> : <Mic size={iconSize[size]} color="#fff" />}
      </div>
    </motion.button>
  );
}

function BottomNav({ current, navigate }: { current: Screen; navigate: (s: Screen) => void }) {
  const tabs: { screen: Screen; icon: React.ReactNode; label: string }[] = [
    { screen: "home", icon: <Home size={22} />, label: "Home" },
    { screen: "bookings", icon: <Bookmark size={22} />, label: "Trips" },
    { screen: "voice", icon: <MessageSquare size={22} />, label: "AI" },
    { screen: "portfolio", icon: <User size={22} />, label: "Profile" },
    { screen: "cs_dashboard", icon: <Headphones size={22} />, label: "CS" },
  ];
  const showNav = ["home", "voice", "bookings", "portfolio", "results", "passenger", "cs_dashboard"].includes(current);
  if (!showNav) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 px-4 pb-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center justify-around rounded-2xl border border-white/8 px-2 py-2"
        style={{ background: "rgba(15,22,41,0.9)", backdropFilter: "blur(20px)" }}
      >
        {tabs.map((t) => {
          const isActive = current === t.screen;
          return (
            <button
              key={t.screen}
              onClick={() => navigate(t.screen)}
              style={{ color: isActive ? "#4F46E5" : "#64748B" }}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
            >
              {t.icon}
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SplashScreen({ navigate }: { navigate: (s: Screen) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => navigate("voice"), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="flex flex-col min-h-screen px-8 items-center justify-center text-center"
      style={{ background: "radial-gradient(ellipse at center, #1a1f3e 0%, #0B1020 60%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)", boxShadow: "0 0 60px rgba(79,70,229,0.4)" }}
        >
          <Navigation size={52} color="#fff" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Wayfinder AI
        </h1>
        <p className="text-sm font-medium tracking-widest uppercase text-indigo-400">Voice · Travel · Accessible</p>
      </motion.div>

      <div className="mt-12 mb-8 h-[120px] flex items-center justify-center">
        <VoiceWave active={true} size="lg" />
      </div>

      <p className="text-xl font-semibold text-white/90 mb-6">
        Accessible Travel for Everyone
      </p>

      <PrimaryButton onClick={() => navigate("voice")} className="w-full max-w-xs py-5 text-lg" icon={<ArrowRight size={22} />}>
        Get Started
      </PrimaryButton>
    </div>
  );
}
function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [micActive, setMicActive] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    import("../services/api").then(({ api }) => {
      api.health()
        .then(() => setBackendStatus("online"))
        .catch(() => setBackendStatus("offline"));
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1020" }}>
      {/* Status badge */}
      <div className="flex items-center justify-end px-5 pt-14 pb-2">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            background: backendStatus === "online" ? "rgba(34,197,94,0.12)" : backendStatus === "offline" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.12)",
            color: backendStatus === "online" ? "#22C55E" : backendStatus === "offline" ? "#EF4444" : "#94A3B8",
            border: `1px solid ${backendStatus === "online" ? "rgba(34,197,94,0.2)" : backendStatus === "offline" ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.2)"}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full"
            style={{
              background: backendStatus === "online" ? "#22C55E" : backendStatus === "offline" ? "#EF4444" : "#94A3B8",
              boxShadow: backendStatus === "online" ? "0 0 6px #22C55E" : "none",
            }}
          />
          {backendStatus === "checking" ? "Checking..." : backendStatus === "online" ? "Backend Connected" : "Backend Offline"}
        </div>
      </div>

      {/* Main content — massive mic centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 -mt-10">
        <h1 className="text-3xl font-extrabold text-white mb-2 text-center">Wayfinder AI</h1>
        <p className="text-sm text-[#94A3B8] mb-10 text-center">Tap the mic and start speaking</p>
        <div className="flex justify-center mb-6" onClick={() => navigate("voice")}>
          <MicButton size="2xl" active={micActive} />
        </div>
        <VoiceWave active={false} size="lg" />
      </div>
    </div>
  );
}

// ── APP ROOT ────────────────────────────────────────────────────

const INITIAL_STATE: ScreenState = {
  sessionId: "",
  offers: [],
  selectedFlight: null,
  searchOrigin: "",
  searchDestination: "",
  searchDate: "",
  passengerName: "",
  passengerAssistance: "none",
  bookingResult: null,
  selectedBooking: null,
  rescheduleBookingId: "",
  rescheduleCurrentDate: "",
  cancelBookingId: "",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [state, setState] = useState<ScreenState>(INITIAL_STATE);

  const updateState = useCallback((partial: Partial<ScreenState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const navigate = useCallback((s: Screen) => {
    setScreen(s);
  }, []);

  // ── Navigation helpers ──────────────────────────────────────

  const goToResults = (offers: FlightOffer[], sessionId: string, origin: string, destination: string, date: string) => {
    updateState({ offers, sessionId, searchOrigin: origin, searchDestination: destination, searchDate: date });
    navigate("results");
  };

  const goToPassenger = async (flight: FlightOffer) => {
    updateState({ selectedFlight: flight });
    // Save selected offer to wizard session so booking can proceed
    if (state.sessionId && flight.id) {
      try {
        await api.wizardSelectFlight(state.sessionId, flight.id);
      } catch (e) {
        console.error("Failed to select flight in wizard:", e);
      }
    }
    navigate("passenger");
  };

  const goToConfirm = (name: string, assistance: string) => {
    updateState({ passengerName: name, passengerAssistance: assistance });
    navigate("confirm");
  };

  const goToSuccess = (booking: BookingResult) => {
    updateState({ bookingResult: booking });
    navigate("success");
  };

  const goToTripDetail = (booking: BookingResult) => {
    updateState({ selectedBooking: booking });
    navigate("tripDetail");
  };

  const goToCancel = (booking: BookingResult) => {
    updateState({ cancelBookingId: booking.id });
    navigate("cancel");
  };

  const goToReschedule = (booking: BookingResult) => {
    updateState({ rescheduleBookingId: booking.id, rescheduleCurrentDate: booking.departure_date });
    navigate("reschedule");
  };

  const goHome = () => {
    setState(INITIAL_STATE);
    navigate("home");
  };

  // ── Screen Renderer ─────────────────────────────────────────

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return <SplashScreen navigate={navigate} />;

      case "home":
        return <HomeScreen navigate={navigate} />;

      case "voice":
        return (
          <VoiceScreen
            onNavigate={(screenName, data) => {
              if (screenName === "results" && data) {
                const params = data.parameters || data;
                goToResults(
                  params.offers || [],
                  params.session_id || state.sessionId,
                  params.origin || "",
                  params.destination || "",
                  params.date || ""
                );
              } else if (screenName === "session_update" && data?.session_id) {
                updateState({ sessionId: data.session_id });
              } else if (screenName === "home") {
                goHome();
              }
            }}
          />
        );

      case "results":
        return (
          <ResultsScreen
            offers={state.offers}
            origin={state.searchOrigin}
            destination={state.searchDestination}
            date={state.searchDate}
            sessionId={state.sessionId}
            onSelect={(offer) => goToPassenger(offer)}
            onBack={() => navigate("voice")}
          />
        );

      case "passenger":
        return (
          <PassengerScreen
            sessionId={state.sessionId}
            onComplete={(name, assistance) => goToConfirm(name, assistance)}
            onBack={() => navigate("results")}
          />
        );

      case "confirm":
        return (
          <ConfirmScreen
            sessionId={state.sessionId}
            flight={state.selectedFlight!}
            origin={state.searchOrigin}
            destination={state.searchDestination}
            date={state.searchDate}
            passengerName={state.passengerName}
            assistance={state.passengerAssistance}
            onConfirm={(booking) => goToSuccess(booking)}
            onBack={() => navigate("passenger")}
          />
        );

      case "success":
        return (
          <SuccessScreen
            booking={state.bookingResult!}
            onDone={goHome}
          />
        );

      case "bookings":
        return (
          <TripsScreen
            onSelectTrip={(booking) => goToTripDetail(booking)}
            onBack={() => navigate("home")}
          />
        );

      case "tripDetail":
        return (
          <TripDetailScreen
            booking={state.selectedBooking!}
            onCancel={(b) => goToCancel(b)}
            onReschedule={(b) => goToReschedule(b)}
            onBack={() => navigate("bookings")}
          />
        );

      case "cancel":
        return (
          <CancelScreen
            bookingId={state.cancelBookingId}
            onComplete={() => navigate("bookings")}
            onBack={() => navigate("tripDetail")}
          />
        );

      case "reschedule":
        return (
          <RescheduleScreen
            bookingId={state.rescheduleBookingId}
            currentDate={state.rescheduleCurrentDate}
            onComplete={() => navigate("bookings")}
            onBack={() => navigate("tripDetail")}
          />
        );

      case "portfolio":
        return (
          <PortfolioScreen
            onBack={() => navigate("home")}
          />
        );

      case "cs_dashboard":
        return <CSDashboard />;

      default:
        return <HomeScreen navigate={navigate} />;
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: "#060912", fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
    >
      <div
        className="relative w-full max-w-sm min-h-screen overflow-hidden"
        style={{ background: "#0B1020" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            className="min-h-screen"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
        <BottomNav current={screen} navigate={navigate} />
        <CSCallHandler sessionId={state.sessionId} />
      </div>
    </div>
  );
}
