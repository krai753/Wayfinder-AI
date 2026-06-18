/**
 * SuccessScreen — booking confirmed.
 *
 * - Huge checkmark animation on entry
 * - Reads the booking reference aloud
 * - Shows the trip + reference + total
 * - "View my trips" and "Book another" CTAs
 */
import { useEffect } from "react";
import { motion } from "motion/react";
import { Check, Volume2, Plane, Home, Bookmark, Calendar, VolumeX } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { speak, stopSpeaking } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";
import { formatDateSpoken, formatPrice, formatTime, stopLabel } from "../../lib/format";

interface SuccessScreenProps {
  navigate: NavFn;
  params?: { booking?: any };
}

export function SuccessScreen({ navigate, params }: SuccessScreenProps) {
  const { reset, origin, destination, departureDate, selectedOffer } = useWizard();
  const { refreshTrips, profile } = useUser();
  const booking = params?.booking;

  useEffect(() => {
    if (!booking) {
      navigate("home");
      return;
    }
    const text = `Booking confirmed. Your reference is ${booking.booking_reference}. Total ${booking.total_amount}. A copy has been sent to your email. Have a great trip, ${profile.name.split(" ")[0]}.`;
    speak({ text });
    refreshTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRead() {
    if (!booking) return;
    speak({
      text: `Booking reference ${booking.booking_reference}. From ${origin?.city} to ${destination?.city}, on ${formatDateSpoken(departureDate || "")}. Total ${booking.total_amount}.`,
    });
  }

  function handleBookAnother() {
    reset();
    stopSpeaking();
    navigate("home");
  }

  function handleViewTrips() {
    reset();
    stopSpeaking();
    navigate("bookings");
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
      <div className="px-5 pt-12 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="relative mb-6"
        >
          {!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(34,197,94,0.3)", filter: "blur(20px)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            </>
          )}
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#16A34A,#22C55E)",
              boxShadow: "0 20px 60px rgba(34,197,94,0.45)",
            }}
            aria-hidden="true"
          >
            <Check size={64} color="#fff" strokeWidth={3} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold text-white mb-2"
        >
          Booking confirmed
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-base text-slate-300 max-w-xs"
        >
          Have a great trip, {profile.name.split(" ")[0]}.
        </motion.p>
      </div>

      <div className="px-5 pt-8 space-y-4">
        {/* Reference card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 text-center" ariaLabel="Booking reference">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
              Booking reference
            </p>
            <p
              className="text-4xl font-extrabold text-white tracking-widest mb-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {booking.booking_reference || "PENDING"}
            </p>
            <button
              type="button"
              onClick={handleRead}
              aria-label="Read booking details aloud"
              className="
                inline-flex items-center gap-2
                px-5 h-[52px] rounded-full
                bg-indigo-500/20 hover:bg-indigo-500/30
                border border-indigo-400/30
                text-white text-sm font-semibold
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                active:scale-95 transition-all
              "
            >
              <Volume2 size={18} aria-hidden="true" />
              <span>Read aloud</span>
            </button>
          </GlassCard>
        </motion.div>

        {/* Trip summary card */}
        {selectedOffer && origin && destination && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-5" ariaLabel="Trip details">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                  aria-hidden="true"
                >
                  <Plane size={20} color="#fff" />
                </div>
                <p className="text-base font-bold text-white">Your trip</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white">{origin.iata}</p>
                  <p className="text-sm text-slate-400">{origin.city}</p>
                </div>
                <Plane size={20} className="text-slate-400" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-white">{destination.iata}</p>
                  <p className="text-sm text-slate-400">{destination.city}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-300 mt-2">
                <Calendar size={14} aria-hidden="true" />
                <span>{formatDateSpoken(departureDate || "")}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                <p className="text-sm text-slate-300">
                  {selectedOffer.airline} • {formatTime(selectedOffer.departure_time)} • {stopLabel(selectedOffer.stops)}
                </p>
                <p className="text-lg font-extrabold text-white">
                  {booking.total_amount || formatPrice(selectedOffer.price, selectedOffer.currency)}
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-2"
        >
          <PrimaryButton
            onClick={handleViewTrips}
            size="xl"
            icon={<Bookmark size={22} />}
            className="w-full"
          >
            View my trips
          </PrimaryButton>
          <PrimaryButton
            onClick={handleBookAnother}
            variant="secondary"
            size="lg"
            icon={<Home size={20} />}
            className="w-full"
          >
            Book another flight
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  );
}
