/**
 * ReviewScreen — final booking summary + huge confirm button.
 *
 * - Auto-reads the entire trip summary aloud
 * - Shows all trip details: route, date, flight, passenger, assistance, total
 * - Edit button to go back to passenger screen
 * - Voice confirm: "Yes, book it"
 * - Huge (80px) primary "Confirm and pay" button
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
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { api } from "../../services/api";
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
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.75) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("accessibility")}
            aria-label="Back"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            "
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">Review your trip</h1>
            <p className="text-sm text-slate-400">{profile.name}, please confirm below</p>
          </div>
          <button
            type="button"
            onClick={handleReadSummary}
            aria-label="Read trip summary aloud"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            "
          >
            <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Hero route card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-6 text-center" ariaLabel="Trip route">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center flex-1">
                <p className="text-5xl font-extrabold text-white tracking-tight">
                  {origin.iata}
                </p>
                <p className="text-sm text-slate-400 mt-1 truncate">{origin.city}</p>
              </div>
              <div className="flex flex-col items-center">
                <Plane size={28} className="text-indigo-300" aria-hidden="true" />
                <div
                  className="w-16 h-px mt-2"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(99,102,241,0.6), rgba(34,197,94,0.6))",
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="text-center flex-1">
                <p className="text-5xl font-extrabold text-white tracking-tight">
                  {destination.iata}
                </p>
                <p className="text-sm text-slate-400 mt-1 truncate">{destination.city}</p>
              </div>
            </div>
            <p className="text-base text-white font-semibold mt-4">
              {formatDateSpoken(departureDate)}
            </p>
          </GlassCard>
        </motion.div>

        {/* Flight details */}
        <GlassCard className="p-5" ariaLabel="Flight details">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.2)" }}
              aria-hidden="true"
            >
              <Plane size={20} className="text-indigo-300" />
            </div>
            <p className="text-base font-bold text-white">Flight details</p>
          </div>
          <div className="space-y-3">
            <Row label="Airline" value={`${offer.airline} ${offer.flight_number}`} />
            <Row label="Departure" value={formatTime(offer.departure_time)} />
            <Row label="Arrival" value={formatTime(offer.arrival_time)} />
            <Row label="Duration" value={formatDuration(minutes)} />
            <Row label="Stops" value={stopLabel(offer.stops)} />
            <Row label="Class" value={offer.cabin_class} />
          </div>
        </GlassCard>

        {/* Passenger */}
        <GlassCard className="p-5" ariaLabel="Passenger details">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.2)" }}
              aria-hidden="true"
            >
              <User size={20} className="text-indigo-300" />
            </div>
            <p className="text-base font-bold text-white">Passenger</p>
            <button
              type="button"
              onClick={() => navigate("passenger")}
              aria-label="Edit passenger details"
              className="ml-auto w-9 h-9 rounded-full bg-white/8 hover:bg-white/12 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
            >
              <Pencil size={16} color="#fff" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3">
            <Row label="Name" value={passengerName || "Not set"} />
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
        </GlassCard>

        {/* Total */}
        <GlassCard className="p-5" ariaLabel="Total price">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider font-bold text-slate-400">
                Total
              </p>
              <p className="text-4xl font-extrabold text-white mt-1">
                {formatPrice(offer.price, offer.currency)}
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#22C55E,#4ADE80)" }}
              aria-hidden="true"
            >
              <ShieldCheck size={28} color="#fff" />
            </div>
          </div>
        </GlassCard>

        {/* Error */}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30">
            <p className="text-base text-red-100 font-semibold">Booking failed</p>
            <p className="text-sm text-red-200/80 mt-1">{error}</p>
          </div>
        )}

        {/* Voice confirm hint */}
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Say "confirm" or "yes" — I'll book it
          </p>
        </div>

        {/* Confirm + Voice confirm */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || confirming || !!booking}
            className="
              w-full min-h-[80px] rounded-3xl
              flex items-center justify-center gap-3
              font-extrabold text-white text-xl
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
              active:scale-[0.98] transition-all
              disabled:opacity-50
            "
            style={{
              background: "linear-gradient(135deg,#16A34A,#22C55E)",
              boxShadow: "0 12px 36px rgba(34,197,94,0.45)",
            }}
          >
            {loading ? (
              <span className="inline-block w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
            ) : (
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            )}
            <span>{loading ? "Booking…" : "Confirm and pay"}</span>
          </button>

          <button
            type="button"
            onClick={handleVoiceConfirm}
            aria-label={listeningConfirm ? "Stop listening for confirmation" : "Say yes to confirm"}
            aria-pressed={listeningConfirm}
            className={`
              w-full min-h-[60px] rounded-2xl
              flex items-center justify-center gap-3
              font-semibold text-white text-base
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              active:scale-[0.98] transition-all
              border
              ${
                listeningConfirm
                  ? "bg-red-500/20 border-red-400/40"
                  : "bg-white/8 border-white/10 hover:bg-white/12"
              }
            `}
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
      <span className="text-sm uppercase tracking-wider font-semibold text-slate-400">
        {label}
      </span>
      <span className="text-base font-semibold text-white text-right flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}
