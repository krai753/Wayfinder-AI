import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plane, MapPin, Calendar, User, Check, Shield, DollarSign, Clock, Accessibility } from "lucide-react";
import { api } from "../../services/api";
import type { FlightOffer } from "../../types";

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

function formatTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT?(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const h = match[1] ? parseInt(match[1]) : 0;
    const m = match[2] ? parseInt(match[2]) : 0;
    return `${h}h ${m}m`;
  }
  return duration;
}

export default function ConfirmScreen({
  sessionId,
  flight,
  origin,
  destination,
  date,
  passengerName,
  assistance,
  onConfirm,
  onBack,
}: {
  sessionId: string;
  flight: FlightOffer;
  origin: string;
  destination: string;
  date: string;
  passengerName: string;
  assistance: string;
  onConfirm: (booking: any) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const speakSummary = useCallback(async () => {
    const summary = `Booking summary. Flight from ${origin} to ${destination} on ${date}. ` +
      `Airline ${flight.airline}, flight ${flight.flight_number}. ` +
      `Departure at ${formatTime(flight.departure_time)}, arrival at ${formatTime(flight.arrival_time)}. ` +
      `Duration ${formatDuration(flight.duration)}. ` +
      `Total price ${flight.price} ${flight.currency}. ` +
      `Passenger: ${passengerName}. ` +
      `Assistance: ${assistance}. ` +
      `Tap confirm to complete your booking.`;
    try {
      const blob = await api.speak(summary);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});
    } catch {
      // TTS error — non-critical
    }
  }, [flight, origin, destination, date, passengerName, assistance]);

  useEffect(() => {
    // Auto-read summary on mount
    const timer = setTimeout(() => speakSummary(), 500);
    return () => clearTimeout(timer);
  }, [speakSummary]);

  const assistanceLabel = assistance === "visual" ? "Visual Assistance" :
    assistance === "wheelchair" ? "Wheelchair" : "None";

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const booking = await api.createBooking(sessionId);
      onConfirm(booking);
    } catch (err: any) {
      setError(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={20} color="#94A3B8" />
        </button>
        <h1 className="text-lg font-bold text-white">Confirm Booking</h1>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Flight Summary Card */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} color="#4F46E5" />
            <p className="text-sm font-semibold text-white">Flight Details</p>
          </div>

          {/* Route */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.15)" }}
            >
              <Plane size={20} color="#4F46E5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-white">{origin}</p>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,#4F46E5,#6366f1,transparent)" }} />
                <MapPin size={14} color="#4F46E5" />
                <p className="text-base font-bold text-white">{destination}</p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar size={12} color="#64748B" />
                  <span className="text-xs text-[#94A3B8]">{date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} color="#64748B" />
                  <span className="text-xs text-[#94A3B8]">{formatTime(flight.departure_time)} → {formatTime(flight.arrival_time)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Airline */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Airline</span>
            <span className="text-sm font-semibold text-white">{flight.airline} · {flight.flight_number}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Duration</span>
            <Badge color="blue">{formatDuration(flight.duration)}</Badge>
          </div>

          {/* Stops */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Stops</span>
            <Badge color={flight.stops === 0 ? "green" : flight.stops === 1 ? "amber" : "red"}>
              {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
            </Badge>
          </div>

          {/* Cabin class */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/8">
            <span className="text-sm text-[#94A3B8]">Cabin</span>
            <span className="text-sm font-semibold text-white capitalize">{flight.cabin_class}</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#94A3B8]">Total Price</span>
            <div className="flex items-center gap-1">
              <DollarSign size={18} color="#22C55E" />
              <span className="text-2xl font-extrabold text-white">{flight.price}</span>
              <span className="text-xs text-[#94A3B8]">{flight.currency}</span>
            </div>
          </div>
        </GlassCard>

        {/* Passenger Summary */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={18} color="#4F46E5" />
            <p className="text-sm font-semibold text-white">Passenger</p>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94A3B8]">Name</span>
            <span className="text-sm font-semibold text-white">{passengerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#94A3B8]">Assistance</span>
            <Badge color={assistance === "none" ? "green" : assistance === "visual" ? "blue" : "amber"}>
              <Accessibility size={12} className="mr-1" />
              {assistanceLabel}
            </Badge>
          </div>
        </GlassCard>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Confirm Button */}
        <PrimaryButton
          onClick={handleConfirm}
          disabled={loading}
          icon={loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
          className="w-full"
        >
          {loading ? "Confirming..." : "✅ Confirm Booking"}
        </PrimaryButton>

        {/* Disclaimer */}
        <p className="text-xs text-center text-[#64748B] px-4">
          By confirming, you agree to the fare rules and cancellation policy. This booking is non-refundable unless cancelled within 24 hours.
        </p>
      </div>
    </div>
  );
}