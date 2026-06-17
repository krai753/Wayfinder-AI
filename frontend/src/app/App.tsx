import { useState, useEffect, useRef } from "react";
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

type Screen =
  | "splash" | "onboard1" | "onboard2" | "onboard3"
  | "home" | "voice" | "origin" | "destination" | "dates"
  | "loading" | "results" | "flightDetail" | "passenger"
  | "accessibility" | "review" | "payment" | "success"
  | "bookings" | "tripDetail" | "assistant" | "profile" | "settingsScreen";

const SCREENS: Screen[] = [
  "splash","onboard1","onboard2","onboard3","home","voice","origin","destination",
  "dates","loading","results","flightDetail","passenger","accessibility","review",
  "payment","success","bookings","tripDetail","assistant","profile","settingsScreen"
];

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

function MicButton({ size = "lg", active = false, onClick }: { size?: "sm" | "md" | "lg"; active?: boolean; onClick?: (e?: React.MouseEvent) => void }) {
  const dims: Record<string, string> = { sm: "w-14 h-14", md: "w-20 h-20", lg: "w-28 h-28" };
  const iconSize: Record<string, number> = { sm: 20, md: 28, lg: 44 };
  return (
    <motion.button
      onClick={onClick}
      className={`relative ${dims[size]} rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50`}
      whileTap={{ scale: 0.92 }}
    >
      {active && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "rgba(79,70,229,0.15)" }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </>
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
    { screen: "assistant", icon: <MessageSquare size={22} />, label: "AI" },
    { screen: "profile", icon: <User size={22} />, label: "Profile" },
  ];
  const mainScreens: Screen[] = ["home","bookings","assistant","profile","settingsScreen","tripDetail","voice","origin","destination","dates","loading","results","flightDetail","passenger","accessibility","review","payment","success"];
  if (!mainScreens.includes(current)) return null;

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
    const t = setTimeout(() => navigate("home"), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-8 text-center"
      style={{ background: "radial-gradient(ellipse at center, #1a1f3e 0%, #0B1020 60%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)", boxShadow: "0 0 60px rgba(79,70,229,0.4)" }}
        >
          <Navigation size={48} color="#fff" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Wayfinder AI
        </h1>
        <p className="text-sm font-medium tracking-widest uppercase text-indigo-400">Voice · Travel · Accessible</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-12 mt-12"
      >
        <VoiceWave active={true} size="lg" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xl font-semibold text-white/90 mb-2"
      >
        Accessible Travel for Everyone
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="w-full max-w-xs mt-12"
      >
        <PrimaryButton onClick={() => navigate("home")} className="w-full" icon={<ArrowRight size={20} />}>
          Get Started
        </PrimaryButton>
      </motion.div>
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
    <div className="min-h-screen pb-28" style={{ background: "#0B1020" }}>
      <div className="px-5 pt-14 pb-8">
        {/* Backend status badge */}
        <div className="flex items-center justify-end mb-4">
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
        <div className="mb-6">
          <p className="text-sm text-[#94A3B8] mb-0.5">Good morning,</p>
          <h1 className="text-2xl font-extrabold text-white">Priya Sharma</h1>
        </div>

        <GlassCard className="p-6 text-center" onClick={() => navigate("voice")}>
          <p className="text-sm text-[#94A3B8] mb-5">Tap to start voice booking</p>
          <div className="flex justify-center mb-5">
            <MicButton
              size="lg"
              active={micActive}
              onClick={(e) => { e?.stopPropagation(); setMicActive(!micActive); }}
            />
          </div>
          <VoiceWave active={micActive} size="md" />
          <p className="text-base font-semibold text-white mt-4">
            {micActive ? "Listening..." : "Start Flight Booking"}
          </p>
        </GlassCard>
      </div>

      <div className="px-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Book Flight", icon: <Plane size={20} /> },
              { label: "My Trips", icon: <Bookmark size={20} /> },
            ].map((a) => (
              <GlassCard key={a.label} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(79,70,229,0.2)" }}>
                  <span style={{ color: "#4F46E5" }}>{a.icon}</span>
                </div>
                <span className="text-sm font-semibold text-white">{a.label}</span>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const navigate = (s: Screen) => setScreen(s);

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return <SplashScreen navigate={navigate} />;
      case "home":
      case "bookings":
      case "assistant":
      case "profile":
        return <HomeScreen navigate={navigate} />;
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
      </div>
    </div>
  );
}