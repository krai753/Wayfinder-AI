/**
 * ReviewScreen — final booking summary + huge confirm button.
 *
 * Refactored for premium quality + blind-user accessibility:
 * - Auto-reads the entire trip summary on mount
 * - Massive hero route card (IATA codes at 5xl)
 * - All trip details laid out as clear rows with eyebrows
 * - Huge (80px) hero "Confirm and pay" button — impossible to miss
 * - Voice confirm: "yes" / "book it" / "confirm" triggers the booking
 * - Voice confirm button (secondary) for explicit voice flow
 * - Massive focus rings for keyboard users
 * - Respects prefers-reduced-motion
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Volume2,
  Pencil,
  Plane,
  User,
  Heart,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import {
  formatDateSpoken,
  formatDuration,
  formatPrice,
  formatTime,
  parseDurationToMinutes,
  stopLabel,
} from "../../lib/format";

interface ReviewScreenProps {
  navigate: NavFn;
}

export function ReviewScreen({ navigate }: ReviewScreenProps) {
  const {
    origin,
    destination,
    departureDate,
    selectedOffer,
    passengerName,
    passengerAssistance,
    sessionId,
    startSession,
  } = useWizard();
  const { profile } = useUser();
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [listeningConfirm, setListeningConfirm] = useState(false);

  const speech = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal) {
        const t = text.toLowerCase();
        if (t.includes("yes") || t.includes("confirm") || t.includes("book") || t.includes("okay") || t.includes("ok")) {
          handleConfirm();
        }
      }
    },
  });

  // Auto-speak the full summary
  useEffect(() => {
    if (!selectedOffer || !origin || !destination || !departureDate) {
      navigate("results");
      return;
    }
    const c = selectedOffer;
    const minutes = parseDurationToMinutes(c.duration);
    const assist =
      passengerAssistance === "wheelchair"
        ? "wheelchair assistance"
        : passengerAssistance === "visual"
          ? "visual assistance"
          : "no assistance needed";
    const text =
      `Reviewing your trip. ` +
      `From ${origin.city} (${origin.iata}) to ${destination.city} (${destination.iata}), ` +
      `on ${formatDateSpoken(departureDate)}. ` +
      `${c.airline} flight ${c.flight_number}, departing ${formatTime(c.departure_time)}, ` +
      `arriving ${formatTime(c.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(c.stops)}. ` +
      `Passenger ${passengerName}. ${assist}. ` +
      `Total ${formatPrice(c.price, c.currency)}. ` +
      `Say "yes" or "confirm" to book, or tap the confirm button.`;
    speak({ text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReadSummary() {
    if (!selectedOffer || !origin || !destination || !departureDate) return;
    const c = selectedOffer;
    const minutes = parseDurationToMinutes(c.duration);
    const assist =
      passengerAssistance === "wheelchair"
        ? "wheelchair assistance"
        : passengerAssistance === "visual"
          ? "visual assistance"
          : "no assistance needed";
    const text =
      `From ${origin.city} to ${destination.city}, on ${formatDateSpoken(departureDate)}. ` +
      `${c.airline} flight ${c.flight_number}, departing ${formatTime(c.departure_time)}, ` +
      `arriving ${formatTime(c.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(c.stops)}. ` +
      `Passenger ${passengerName}. ${assist}. ` +
      `Total ${formatPrice(c.price, c.currency)}.`;
    speak({ text });
  }

  async function handleConfirm() {
    if (confirming || booking) return;
    setConfirming(true);
    setLoading(true);
    setError(null);
    try {
      const sid = sessionId || (await startSession());
      const res = await api.createBooking(sid);
      setBooking(res);
      speak({
        text: `Booking confirmed. Your reference is ${res.booking_reference}. Total ${res.total_amount}.`,
      });
      navigate("success", { booking: res });
    } catch (e: any) {
      const msg = e?.message ?? "Booking failed. Please try again.";
      setError(msg);
      speak({ text: `Sorry, I couldn't complete the booking. ${msg}` });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  function handleVoiceConfirm() {
    if (listeningConfirm) {
      speech.stopListening();
      setListeningConfirm(false);
    } else {
      setListeningConfirm(true);
      speech.startListening();
    }
  }

  if (!selectedOffer || !origin || !destination || !departureDate) {
    return null;
  }

  const offer = selectedOffer;
  const minutes = parseDurationToMinutes(offer.duration);

  return (
    <div
      className="min-h-[100dvh] pb-32"
      style={{ background: tokens.color.bg.deep }}
    >
      <div
        className="sticky top-0 z-20 px-5 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("accessibility")}
            aria-label="Back"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] transition-colors"
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white" style={type.h3}>
              Review your trip
            </h1>
            <p className="text-slate-400 truncate" style={type.bodySm}>
              {profile.name}, please confirm below
            </p>
          </div>
          <button
            type="button"
            onClick={handleReadSummary}
            aria-label="Read trip summary aloud"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 transition-colors"
          >
            <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Hero route card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card variant="tinted" padding="xl" className="text-center">
            <p className="text-indigo-300 mb-4" style={type.eyebrow}>
              Your trip
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p
                  className="text-white leading-none"
                  style={{
                    fontSize: "clamp(3rem, 14vw, 4.5rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {origin.iata}
                </p>
                <p className="text-slate-400 mt-2 truncate" style={type.bodySm}>
                  {origin.city}
                </p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: tokens.gradient.primary,
                    boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
                  }}
                  aria-hidden="true"
                >
                  <Plane size={20} color="#fff" />
                </div>
                <div
                  className="w-12 h-px mt-2"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(99,102,241,0.6), rgba(34,197,94,0.6))",
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 text-center">
                <p
                  className="text-white leading-none"
                  style={{
                    fontSize: "clamp(3rem, 14vw, 4.5rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {destination.iata}
                </p>
                <p className="text-slate-400 mt-2 truncate" style={type.bodySm}>
                  {destination.city}
                </p>
              </div>
            </div>
            <p
              className="text-white mt-6"
              style={{ ...type.h3, fontWeight: 600, letterSpacing: "-0.015em" }}
            >
              {formatDateSpoken(departureDate)}
            </p>
          </Card>
        </motion.div>

        {/* Flight details */}
        <Card variant="default" padding="md" ariaLabel="Flight details">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.2)" }}
              aria-hidden="true"
            >
              <Plane size={20} className="text-indigo-300" />
            </div>
            <p className="text-white" style={{ ...type.bodyLg, fontWeight: 700 }}>
              Flight details
            </p>
          </div>
          <div className="space-y-3">
            <Row label="Airline" value={`${offer.airline} ${offer.flight_number}`} />
            <Row label="Departure" value={formatTime(offer.departure_time)} />
            <Row label="Arrival" value={formatTime(offer.arrival_time)} />
            <Row label="Duration" value={formatDuration(minutes)} />
            <Row label="Stops" value={stopLabel(offer.stops)} />
            <Row label="Class" value={offer.cabin_class} />
          </div>
        </Card>

        {/* Passenger */}
        <Card variant="default" padding="md" ariaLabel="Passenger details">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.2)" }}
              aria-hidden="true"
            >
              <User size={20} className="text-indigo-300" />
            </div>
            <p className="text-white" style={{ ...type.bodyLg, fontWeight: 700 }}>
              Passenger
            </p>
            <button
              type="button"
              onClick={() => navigate("passenger")}
              aria-label="Edit passenger details"
              className="ml-auto w-10 h-10 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-indigo-300/60"
            >
              <Pencil size={16} color="#fff" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3">
            <Row label="Name" value={passengerName || "Not set"} />
            <Row
              label="Date"
              value={formatDateSpoken(departureDate)}
              icon={<Calendar size={14} className="text-cyan-300" aria-hidden="true" />}
            />
            <Row
              label="Assistance"
              value={
                passengerAssistance === "wheelchair"
                  ? "Wheelchair"
                  : passengerAssistance === "visual"
                    ? "Visual assistance"
                    : "None"
              }
              icon={<Heart size={14} className="text-pink-300" aria-hidden="true" />}
            />
          </div>
        </Card>

        {/* Total */}
        <Card variant="raised" padding="md" ariaLabel="Total price">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400" style={type.eyebrow}>
                Total
              </p>
              <p
                className="text-white mt-1"
                style={{
                  fontSize: "clamp(2.5rem, 10vw, 3.5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {formatPrice(offer.price, offer.currency)}
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: tokens.gradient.success,
                boxShadow: "0 10px 30px rgba(34,197,94,0.4)",
              }}
              aria-hidden="true"
            >
              <ShieldCheck size={28} color="#fff" />
            </div>
          </div>
        </Card>

        {error && (
          <div role="alert" className="p-5 rounded-2xl bg-red-500/10 border border-red-400/30">
            <p className="text-red-100" style={{ ...type.bodyLg, fontWeight: 700 }}>
              Booking failed
            </p>
            <p className="text-red-200/80 mt-1" style={type.bodySm}>
              {error}
            </p>
          </div>
        )}

        <p className="text-center text-slate-400" style={type.bodySm}>
          Say "confirm" or "yes" — I'll book it
        </p>

        <div className="space-y-3 pt-2">
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={loading || confirming || !!booking}
            whileTap={!loading && !confirming && !booking ? { scale: 0.98 } : undefined}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-full min-h-[80px] rounded-3xl flex items-center justify-center gap-3 font-extrabold text-white focus:outline-none focus:ring-4 focus:ring-emerald-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] active:scale-[0.98] transition-all disabled:opacity-50"
            style={{
              background: tokens.gradient.success,
              boxShadow: tokens.elevation.glowSuccess,
              fontSize: type.h3.size,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {loading ? (
              <span
                className="inline-block w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            )}
            <span>{loading ? "Booking…" : "Confirm and pay"}</span>
          </motion.button>

          <button
            type="button"
            onClick={handleVoiceConfirm}
            aria-label={listeningConfirm ? "Stop listening for confirmation" : "Say yes to confirm"}
            aria-pressed={listeningConfirm}
            className={`w-full min-h-[60px] rounded-2xl flex items-center justify-center gap-3 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-300/70 active:scale-[0.98] transition-all border ${
              listeningConfirm
                ? "bg-red-500/20 border-red-400/40"
                : "bg-white/8 border-white/10 hover:bg-white/12"
            }`}
            style={type.bodyLg as any}
          >
            <Volume2 size={20} aria-hidden="true" />
            <span>{listeningConfirm ? "Listening…" : "Confirm by voice"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400" style={type.eyebrow}>
        {label}
      </span>
      <span
        className="text-white text-right flex items-center gap-1.5"
        style={type.bodyLg as any}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
