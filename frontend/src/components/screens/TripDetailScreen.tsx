import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plane, MapPin, Calendar, User, DollarSign, Volume2, Clock, Shield } from "lucide-react";
import { api } from "../../services/api";
import type { BookingResult } from "../../types";

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function TripDetailScreen({
  booking,
  onCancel,
  onReschedule,
  onBack,
}: {
  booking: BookingResult;
  onCancel: (b: any) => void;
  onReschedule: (b: any) => void;
  onBack: () => void;
}) {
  const [fullBooking, setFullBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadFullBooking();
  }, [booking.id]);

  const loadFullBooking = async () => {
    setLoading(true);
    try {
      const details = await api.getBooking(booking.id);
      setFullBooking(details);
    } catch {
      // If getBooking fails, fall back to the booking prop data
      setFullBooking(booking);
    } finally {
      setLoading(false);
    }
  };

  const displayData = fullBooking || booking;

  const handleReadDetails = useCallback(async () => {
    setSpeaking(true);
    const status = displayData.status?.toLowerCase() === "cancelled" ? "Cancelled" : "Confirmed";
    const text = `Trip details. Flight from ${displayData.origin} to ${displayData.destination}. ` +
      `Date: ${formatDate(displayData.departure_date)}. ` +
      `Airline and flight: ${displayData.flight_summary || "N/A"}. ` +
      `Passenger: ${displayData.passenger_name || "N/A"}. ` +
      `Booking reference: ${displayData.booking_reference || "N/A"}. ` +
      `Total amount: ${displayData.total_amount || "N/A"}. ` +
      `Status: ${status}.`;
    try {
      const blob = await api.speak(text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      audio.play().catch(() => setSpeaking(false));
    } catch {
      setSpeaking(false);
    }
  }, [displayData]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => handleReadDetails(), 600);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const statusColor = displayData.status?.toLowerCase() === "cancelled" ? "red" : "green";
  const statusLabel = displayData.status?.toLowerCase() === "cancelled" ? "Cancelled" : "Confirmed";

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
        <h1 className="text-lg font-bold text-white">Trip Details</h1>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-sm text-[#94A3B8]">Loading trip details...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Flight Details Card */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} color="#4F46E5" />
                <p className="text-sm font-semibold text-white">Flight Details</p>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/8">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(79,70,229,0.15)" }}
                >
                  <Plane size={22} color="#4F46E5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">{displayData.origin}</p>
                    <div
                      className="flex-1 h-px"
                      style={{ background: "linear-gradient(90deg,#4F46E5,#6366f1,transparent)" }}
                    />
                    <MapPin size={14} color="#4F46E5" />
                    <p className="text-lg font-bold text-white">{displayData.destination}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} color="#64748B" />
                      <span className="text-xs text-[#94A3B8]">{formatDate(displayData.departure_date)}</span>
                    </div>
                  </div>
                </div>
                <Badge color={statusColor}>{statusLabel}</Badge>
              </div>

              {/* Airline / Flight */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#94A3B8]">Airline / Flight</span>
                <span className="text-sm font-semibold text-white">{displayData.flight_summary || "N/A"}</span>
              </div>

              {/* Passenger */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#94A3B8]">Passenger</span>
                <div className="flex items-center gap-1">
                  <User size={14} color="#64748B" />
                  <span className="text-sm font-semibold text-white">{displayData.passenger_name || "N/A"}</span>
                </div>
              </div>

              {/* Booking Reference */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/8">
                <span className="text-sm text-[#94A3B8]">Reference</span>
                <span className="text-sm font-mono font-semibold text-white/80">{displayData.booking_reference || "N/A"}</span>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Total Amount</span>
                <div className="flex items-center gap-1">
                  <DollarSign size={18} color="#22C55E" />
                  <span className="text-2xl font-extrabold text-white">{displayData.total_amount || "N/A"}</span>
                </div>
              </div>
            </GlassCard>

            {/* TTS Button */}
            <button
              onClick={handleReadDetails}
              disabled={speaking}
              className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-3 text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.1)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <Volume2 size={18} />
              {speaking ? "Speaking..." : "🔊 Read Details"}
            </button>

            {/* Action Buttons */}
            {statusLabel === "Confirmed" && (
              <div className="space-y-3 pt-2">
                <PrimaryButton
                  onClick={() => onReschedule(displayData)}
                  icon={<Clock size={20} />}
                  className="w-full"
                >
                  ✈️ Reschedule Flight
                </PrimaryButton>

                <button
                  onClick={() => onCancel(displayData)}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-4 font-semibold text-white transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0B1020]"
                  style={{ background: "linear-gradient(135deg,#DC2626,#EF4444)" }}
                >
                  ❌ Cancel Booking
                </button>
              </div>
            )}

            {statusLabel === "Cancelled" && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <p className="text-sm text-red-400">This booking has been cancelled.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}