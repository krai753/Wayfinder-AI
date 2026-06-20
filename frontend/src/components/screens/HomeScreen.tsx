/**
 * HomeScreen — voice-first home.
 *
 * Simpler, cleaner design for accessibility:
 * - Editorial greeting with user's name
 * - HUGE mic button — the primary action, no distractions
 * - No Quick Actions — just tap mic to speak
 * - Next trip card (if any)
 * - Backend status indicator
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Plane } from "lucide-react";
import { api } from "../../services/api";
import { useUser } from "../../hooks/useUser";
import { speak } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { VoiceMicButton, MicState } from "../ui/VoiceMicButton";
import { VoiceWave } from "../ui/VoiceWave";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import { formatDateSpoken } from "../../lib/format";

interface HomeScreenProps {
  navigate: NavFn;
}

export function HomeScreen({ navigate }: HomeScreenProps) {
  const { profile, trips } = useUser();
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
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
      (t) =>
        t.status === "confirmed" &&
        t.departure_date >= new Date().toISOString().slice(0, 10)
    );
    let text = `Welcome back, ${profile.name.split(" ")[0]}. Tap the microphone to start booking.`;
    if (upcoming[0]) {
      text += ` Your next trip is from ${upcoming[0].origin} to ${upcoming[0].destination} on ${formatDateSpoken(upcoming[0].departure_date)}.`;
    }
    speak({ text });
  }, [profile.name, trips]);

  const firstName = profile.name.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter(
    (t) => t.status === "confirmed" && t.departure_date >= today
  );

  function handleMicTap() {
    if (micState === "idle") {
      setMicState("listening");
      speak({ text: "Opening voice assistant" });
      setTimeout(() => {
        navigate("voice");
        setMicState("idle");
      }, 600);
    }
  }

  const statusColor = backendStatus === "online" ? "#22C55E" : backendStatus === "offline" ? "#EF4444" : "#94A3B8";
  const statusText = backendStatus === "checking" ? "Checking…" : backendStatus === "online" ? "Online" : "Offline";

  return (
    <div
      className="min-h-[100dvh] pb-32 relative"
      style={{ background: tokens.color.bg.deep }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-5 pt-5 pb-3"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 mb-1" style={type.eyebrow}>
              Good day
            </p>
            <h1
              className="text-white"
              style={{
                ...type.h1,
                fontSize: "clamp(2rem, 7vw, 2.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              {firstName}
            </h1>
          </div>
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{
              background:
                backendStatus === "online"
                  ? "rgba(34,197,94,0.10)"
                  : backendStatus === "offline"
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(148,163,184,0.10)",
              border: `1px solid ${statusColor}33`,
            }}
            aria-label={`Backend ${statusText}`}
            role="status"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: statusColor,
                boxShadow:
                  backendStatus === "online"
                    ? `0 0 8px ${statusColor}`
                    : "none",
              }}
            />
            <span className="text-xs font-semibold" style={{ color: statusColor }}>
              {statusText}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-10 space-y-6">
        {/* HERO — Giant mic button fills the page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center justify-center min-h-[50vh]"
        >
          <Card
            variant="raised"
            padding="xl"
            onClick={() => navigate("voice")}
            ariaLabel="Open voice assistant to book a flight by speaking"
            className="relative overflow-visible w-full"
          >
            {/* Ambient halo behind the mic */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: "30%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "350px",
                height: "350px",
                background:
                  "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(34,197,94,0.12) 40%, transparent 70%)",
                filter: "blur(40px)",
              }}
              aria-hidden="true"
            />

            <div className="relative flex flex-col items-center text-center py-4">
              <p className="text-indigo-300 mb-3 text-xs font-semibold tracking-[0.15em] uppercase">
                Voice booking
              </p>
              <p
                className="text-white mb-6"
                style={{ ...type.h2, fontWeight: 700, letterSpacing: "-0.015em" }}
              >
                {micState === "listening" ? "Opening…" : "Tap to speak"}
              </p>
              <div className="mb-4 scale-125">
                <VoiceMicButton
                  state={micState}
                  onClick={handleMicTap}
                  size="2xl"
                />
              </div>
              <VoiceWave active={micState === "listening"} size="lg" />
            </div>
          </Card>
        </motion.div>

        {/* Next trip — only when present */}
        {upcoming[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white" style={type.eyebrow}>
                Next trip
              </h2>
              <button
                onClick={() => navigate("bookings")}
                className="text-slate-400 hover:text-white transition-colors"
                style={type.labelSm as any}
                aria-label="View all trips"
              >
                View all →
              </button>
            </div>
            <Card
              variant="tinted"
              padding="lg"
              onClick={() => navigate("tripDetail", { bookingId: upcoming[0].id })}
              ariaLabel={`Next trip from ${upcoming[0].origin} to ${upcoming[0].destination} on ${formatDateSpoken(upcoming[0].departure_date)}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: tokens.gradient.primary,
                    boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
                  }}
                  aria-hidden="true"
                >
                  <Plane size={26} color="#fff" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-white"
                    style={{ ...type.h2, fontWeight: 800, letterSpacing: "-0.02em" }}
                  >
                    {upcoming[0].origin} → {upcoming[0].destination}
                  </p>
                  <p className="text-slate-400 mt-0.5" style={type.bodySm as any}>
                    {formatDateSpoken(upcoming[0].departure_date)}
                  </p>
                </div>
                <ArrowRight
                  size={22}
                  className="text-slate-400 shrink-0"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}