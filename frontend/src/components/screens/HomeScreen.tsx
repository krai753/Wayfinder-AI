/**
 * HomeScreen — voice-first home.
 *
 * - Greeting + user name
 * - Backend status indicator
 * - GIANT mic button (auto-focuses, biggest element on the page)
 * - Quick actions: Book, My trips, AI assistant, Stats
 * - Recent trip if any
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Plane,
  Bookmark,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { api } from "../../services/api";
import { useUser } from "../../hooks/useUser";
import { useWizard } from "../../hooks/useWizard";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { VoiceMicButton, MicState } from "../ui/VoiceMicButton";
import { VoiceWave } from "../ui/VoiceWave";
import { NavFn } from "../../types";
import { formatDateSpoken } from "../../lib/format";

interface HomeScreenProps {
  navigate: NavFn;
}

export function HomeScreen({ navigate }: HomeScreenProps) {
  const { profile, trips } = useUser();
  const { reset } = useWizard();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [micState, setMicState] = useState<MicState>("idle");

  useEffect(() => {
    api
      .health()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  // Read greeting on mount (first time only)
  useEffect(() => {
    const greeted = sessionStorage.getItem("wayfinder.greeted");
    if (greeted) return;
    sessionStorage.setItem("wayfinder.greeted", "1");
    const upcoming = trips.filter(
      (t) => t.status === "confirmed" && t.departure_date >= new Date().toISOString().slice(0, 10)
    );
    let text = `Welcome back, ${profile.name.split(" ")[0]}. Tap the microphone to start booking.`;
    if (upcoming[0]) {
      text += ` Your next trip is from ${upcoming[0].origin} to ${upcoming[0].destination} on ${formatDateSpoken(upcoming[0].departure_date)}.`;
    }
    speak({ text });
  }, [profile.name, trips]);

  const firstName = profile.name.split(" ")[0];
  const upcoming = trips.filter(
    (t) => t.status === "confirmed" && t.departure_date >= new Date().toISOString().slice(0, 10)
  );

  function handleMicTap() {
    // Going to the voice screen handles actual STT, but we also
    // press the mic here to feel "always listening"
    if (micState === "idle") {
      setMicState("listening");
      speak({ text: "Opening voice assistant" });
      setTimeout(() => {
        navigate("voice");
        setMicState("idle");
      }, 600);
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 px-5 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Good day,</p>
            <h1 className="text-2xl font-extrabold text-white">{firstName}</h1>
          </div>
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background:
                backendStatus === "online"
                  ? "rgba(34,197,94,0.12)"
                  : backendStatus === "offline"
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(148,163,184,0.12)",
              color:
                backendStatus === "online"
                  ? "#86EFAC"
                  : backendStatus === "offline"
                    ? "#FCA5A5"
                    : "#94A3B8",
              border: `1px solid ${
                backendStatus === "online"
                  ? "rgba(34,197,94,0.2)"
                  : backendStatus === "offline"
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(148,163,184,0.2)"
              }`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  backendStatus === "online"
                    ? "#22C55E"
                    : backendStatus === "offline"
                      ? "#EF4444"
                      : "#94A3B8",
                boxShadow: backendStatus === "online" ? "0 0 6px #22C55E" : "none",
              }}
            />
            {backendStatus === "checking"
              ? "Checking…"
              : backendStatus === "online"
                ? "Online"
                : "Offline"}
          </div>
        </div>
      </div>

      <div className="px-5 pt-2">
        {/* Hero mic card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard
            className="p-8 text-center"
            onClick={() => navigate("voice")}
            ariaLabel="Open voice assistant to book a flight by speaking"
          >
            <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold mb-2">
              Voice booking
            </p>
            <p className="text-2xl font-extrabold text-white mb-6">
              {micState === "listening" ? "Opening…" : "Tap to speak"}
            </p>
            <div className="flex justify-center mb-6">
              <VoiceMicButton
                state={micState}
                onClick={handleMicTap}
                size="xl"
              />
            </div>
            <VoiceWave active={micState === "listening"} size="lg" />
            <p className="text-sm text-slate-300 mt-4">
              Try: "Book a flight from London to Paris tomorrow"
            </p>
          </GlassCard>
        </motion.div>

        {/* Next trip */}
        {upcoming[0] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
              Next trip
            </h2>
            <GlassCard
              className="p-5"
              onClick={() => navigate("tripDetail", { bookingId: upcoming[0].id })}
              ariaLabel={`Next trip from ${upcoming[0].origin} to ${upcoming[0].destination} on ${formatDateSpoken(upcoming[0].departure_date)}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                  aria-hidden="true"
                >
                  <Plane size={26} color="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-extrabold text-white">
                    {upcoming[0].origin} → {upcoming[0].destination}
                  </p>
                  <p className="text-sm text-slate-300">
                    {formatDateSpoken(upcoming[0].departure_date)}
                  </p>
                </div>
                <ArrowRight size={22} className="text-slate-400 shrink-0" aria-hidden="true" />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<Plane size={20} className="text-indigo-300" aria-hidden="true" />}
              label="Book flight"
              onClick={() => {
                reset();
                navigate("origin");
              }}
            />
            <QuickAction
              icon={<Bookmark size={20} className="text-emerald-300" aria-hidden="true" />}
              label="My trips"
              onClick={() => navigate("bookings")}
            />
            <QuickAction
              icon={<BarChart3 size={20} className="text-amber-300" aria-hidden="true" />}
              label="Travel stats"
              onClick={() => navigate("portfolio")}
            />
            <QuickAction
              icon={<Sparkles size={20} className="text-pink-300" aria-hidden="true" />}
              label="AI assistant"
              onClick={() => navigate("assistant")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <GlassCard
      className="p-4"
      onClick={onClick}
      ariaLabel={label}
    >
      <div className="flex flex-col gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <p className="text-base font-bold text-white">{label}</p>
      </div>
    </GlassCard>
  );
}
