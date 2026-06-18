/**
 * SuccessScreen — booking confirmed.
 *
 * Refactored for premium quality + blind-user accessibility:
 * - Massive checkmark animation on entry (celebration moment)
 * - Hero "Booking confirmed" headline reads aloud via TTS
 * - Booking reference in monospace at h1 size (so it stands out)
 * - "Read aloud" button for explicit re-read
 * - Big "View my trips" CTA (primary)
 * - "Book another flight" CTA (secondary)
 * - All accessibility preserved
 */
import { useEffect } from "react";
import { motion } from "motion/react";
import {
  Check,
  Volume2,
  Plane,
  Home,
  Bookmark,
  Calendar,
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { speak, stopSpeaking } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import { formatDateSpoken, formatTime, stopLabel } from "../../lib/format";

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
    <div
      className="min-h-[100dvh] pb-32 relative overflow-hidden"
      style={{ background: tokens.color.bg.deep }}
    >
      {/* Ambient celebration halo */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "10%",
          left: "50%",
          transform: "translate(-50%, 0)",
          width: "min(500px, 130vw)",
          height: "min(500px, 130vw)",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.20) 0%, transparent 65%)",
          filter: "blur(30px)",
        }}
        aria-hidden="true"
      />

      <div className="relative px-5 pt-12 flex flex-col items-center text-center">
        {/* Hero checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="relative mb-8"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "rgba(34,197,94,0.32)",
              filter: "blur(20px)",
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.85, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: tokens.gradient.success,
              boxShadow: "0 20px 60px rgba(34,197,94,0.5), inset 0 2px 2px rgba(255,255,255,0.18)",
              border: "1.5px solid rgba(255, 255, 255, 0.18)",
            }}
            aria-hidden="true"
          >
            <Check size={64} color="#fff" strokeWidth={3} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-white"
          style={{
            ...type.h1,
            fontSize: "clamp(2rem, 8vw, 2.75rem)",
            letterSpacing: "-0.03em",
            fontWeight: 800,
          }}
        >
          Booking confirmed
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-slate-300 max-w-xs mt-3"
          style={type.bodyLg as any}
        >
          Have a great trip, {profile.name.split(" ")[0]}.
        </motion.p>
      </div>

      <div className="relative px-5 pt-10 space-y-5">
        {/* Reference card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card variant="success" padding="lg" className="text-center">
            <p className="text-emerald-300 mb-2" style={type.eyebrow as any}>
              Booking reference
            </p>
            <p
              className="text-white mb-4"
              style={{
                fontFamily: tokens.font.mono,
                fontSize: "clamp(2rem, 8vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {booking.booking_reference || "PENDING"}
            </p>
            <Button
              onClick={handleRead}
              variant="secondary"
              size="md"
              icon={<Volume2 size={18} />}
            >
              Read aloud
            </Button>
          </Card>
        </motion.div>

        {/* Trip summary card */}
        {selectedOffer && origin && destination && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card variant="default" padding="md" ariaLabel="Trip details">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: tokens.gradient.primary }}
                  aria-hidden="true"
                >
                  <Plane size={20} color="#fff" />
                </div>
                <p className="text-white" style={{ ...type.bodyLg as any, fontWeight: 700 }}>
                  Your trip
                </p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <p
                    className="text-white"
                    style={{ ...type.h2, fontWeight: 800, letterSpacing: "-0.02em" }}
                  >
                    {origin.iata}
                  </p>
                  <p className="text-slate-400" style={type.bodySm as any}>
                    {origin.city}
                  </p>
                </div>
                <Plane size={20} className="text-slate-400" aria-hidden="true" />
                <div className="text-center">
                  <p
                    className="text-white"
                    style={{ ...type.h2, fontWeight: 800, letterSpacing: "-0.02em" }}
                  >
                    {destination.iata}
                  </p>
                  <p className="text-slate-400" style={type.bodySm as any}>
                    {destination.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-300 mt-3" style={type.bodySm as any}>
                <Calendar size={14} aria-hidden="true" />
                <span>{formatDateSpoken(departureDate || "")}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-slate-300" style={type.bodySm as any}>
                  {selectedOffer.airline} • {formatTime(selectedOffer.departure_time)} •{" "}
                  {stopLabel(selectedOffer.stops)}
                </p>
                <p className="text-white" style={{ ...type.h3, fontWeight: 800 }}>
                  {booking.total_amount ||
                    `${selectedOffer.price} ${selectedOffer.currency}`}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 pt-2"
        >
          <Button
            onClick={handleViewTrips}
            size="xl"
            icon={<Bookmark size={22} />}
            fullWidth
          >
            View my trips
          </Button>
          <Button
            onClick={handleBookAnother}
            variant="secondary"
            size="lg"
            icon={<Home size={20} />}
            fullWidth
          >
            Book another flight
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
