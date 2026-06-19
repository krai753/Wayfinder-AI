import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plane, MapPin, Calendar, Volume2, ChevronRight, DollarSign } from "lucide-react";
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

export default function TripsScreen({
  onSelectTrip,
  onBack,
}: {
  onSelectTrip: (booking: any) => void;
  onBack: () => void;
}) {
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getHistory("user_1");
      const sorted = (result.bookings || []).sort((a, b) => {
        const da = new Date(a.departure_date || a.created_at || 0).getTime();
        const db = new Date(b.departure_date || b.created_at || 0).getTime();
        return db - da;
      });
      setBookings(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = useCallback(async () => {
    if (bookings.length === 0) return;
    setSpeaking(true);
    const summary = `You have ${bookings.length} trip${bookings.length !== 1 ? "s" : ""}. ` +
      bookings.map((b, i) =>
        `${i + 1}: ${b.origin} to ${b.destination}, ${b.departure_date || "unknown date"}, ` +
        `${b.flight_summary || "flight"}, ${b.status || "booked"}, ` +
        `reference ${b.booking_reference || "N/A"}, ${b.total_amount || "N/A"}.`
      ).join(" ");
    try {
      const blob = await api.speak(summary);
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
  }, [bookings]);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
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
        <h1 className="text-lg font-bold text-white">My Trips</h1>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Count badge + Read All */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)", color: "#fff" }}
            >
              {bookings.length}
            </span>
            <span className="text-sm font-semibold text-white">
              {bookings.length === 1 ? "trip" : "trips"}
            </span>
          </div>
          {bookings.length > 0 && (
            <button
              onClick={handleReadAll}
              disabled={speaking}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.12)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <Volume2 size={14} />
              {speaking ? "Speaking..." : "Read All"}
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-sm text-[#94A3B8]">Loading your trips...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={loadHistory}
              className="mt-3 text-xs font-medium text-[#4F46E5] underline focus:outline-none"
            >
              Tap to retry
            </button>
          </div>
        )}

        {/* Trip Cards */}
        {!loading && (
          <div className="space-y-3">
            {bookings.map((booking, index) => {
              const statusColor = booking.status?.toLowerCase() === "cancelled" ? "red" : "green";
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className="p-5"
                    onClick={() => onSelectTrip(booking)}
                  >
                    {/* Route header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(79,70,229,0.15)" }}
                      >
                        <Plane size={20} color="#4F46E5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-white">{booking.origin}</p>
                          <MapPin size={12} color="#4F46E5" />
                          <p className="text-base font-bold text-white">{booking.destination}</p>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          <Calendar size={10} className="inline mr-1" />
                          {formatDate(booking.departure_date)}
                        </p>
                      </div>
                      <ChevronRight size={18} color="#64748B" />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/8 mb-3" />

                    {/* Details row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#94A3B8]">{booking.flight_summary || "Flight"}</span>
                      <Badge color={statusColor}>
                        {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
                      </Badge>
                    </div>

                    {/* Reference + Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#64748B]">Ref:</span>
                        <span className="text-xs font-mono text-white/70">{booking.booking_reference || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} color="#22C55E" />
                        <span className="text-sm font-bold text-white">{booking.total_amount || "N/A"}</span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}

            {/* Empty state */}
            {bookings.length === 0 && !loading && (
              <div className="text-center py-16">
                <Plane size={48} color="#2D3B55" className="mx-auto mb-4" />
                <p className="text-base font-semibold text-white">No trips yet</p>
                <p className="text-sm text-[#94A3B8] mt-1">Book your first flight!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
