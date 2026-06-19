import { useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plane, Clock, MapPin, ChevronRight, Volume2, DollarSign } from "lucide-react";
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
  // Handle PT2H30M or ISO duration format
  const match = duration.match(/PT?(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const h = match[1] ? parseInt(match[1]) : 0;
    const m = match[2] ? parseInt(match[2]) : 0;
    return `${h}h ${m}m`;
  }
  return duration;
}

export default function ResultsScreen({
  offers,
  origin,
  destination,
  date,
  sessionId,
  onSelect,
  onBack,
}: {
  offers: FlightOffer[];
  origin: string;
  destination: string;
  date: string;
  sessionId: string;
  onSelect: (offer: FlightOffer) => void;
  onBack: () => void;
}) {
  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      const pa = parseFloat(a.price);
      const pb = parseFloat(b.price);
      return pa - pb;
    });
  }, [offers]);

  const handleReadAll = useCallback(async () => {
    if (sortedOffers.length === 0) return;
    const summary = `Found ${sortedOffers.length} flights from ${origin} to ${destination} on ${date}. ` +
      sortedOffers.map((o, i) =>
        `${i + 1}: ${o.airline} flight ${o.flight_number}, ${o.price} ${o.currency}, ` +
        `departing at ${formatTime(o.departure_time)}, arriving at ${formatTime(o.arrival_time)}, ` +
        `duration ${formatDuration(o.duration)}.`
      ).join(" ");
    try {
      const blob = await api.speak(summary);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});
    } catch {
      // TTS error — non-critical
    }
  }, [sortedOffers, origin, destination, date]);

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
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Flight Results</h1>
          <p className="text-xs text-[#94A3B8]">{origin} → {destination} · {date}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Results count + Read All */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)", color: "#fff" }}
            >
              {offers.length}
            </span>
            <span className="text-sm font-semibold text-white">
              {offers.length === 1 ? "flight" : "flights"} found
            </span>
          </div>
          {sortedOffers.length > 0 && (
            <button
              onClick={handleReadAll}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              style={{ background: "rgba(99,102,241,0.12)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <Volume2 size={14} />
              Read All
            </button>
          )}
        </div>

        {/* Flight Offers List */}
        <div className="space-y-3">
          {sortedOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <GlassCard className="p-5">
                {/* Airline + Badge row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(79,70,229,0.15)" }}
                    >
                      <Plane size={16} color="#4F46E5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{offer.airline}</p>
                      <p className="text-xs text-[#94A3B8]">{offer.flight_number}</p>
                    </div>
                  </div>
                  <Badge color={offer.stops === 0 ? "green" : offer.stops === 1 ? "amber" : "red"}>
                    {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
                  </Badge>
                </div>

                {/* Route times */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{formatTime(offer.departure_time)}</p>
                    <p className="text-xs text-[#94A3B8]">{offer.origin}</p>
                  </div>
                  <div className="flex-1 mx-4 flex flex-col items-center">
                    <Clock size={14} color="#64748B" />
                    <p className="text-xs text-[#64748B] mt-1">{formatDuration(offer.duration)}</p>
                    <div className="w-full h-px mt-1" style={{ background: "linear-gradient(90deg,transparent,#4F46E5,transparent)" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">{formatTime(offer.arrival_time)}</p>
                    <p className="text-xs text-[#94A3B8]">{offer.destination}</p>
                  </div>
                </div>

                {/* Price + Select */}
                <div className="flex items-center justify-between pt-3 border-t border-white/8">
                  <div>
                    <p className="text-xs text-[#94A3B8]">Total price</p>
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} color="#22C55E" />
                      <p className="text-2xl font-extrabold text-white">{offer.price}</p>
                      <span className="text-xs text-[#94A3B8]">{offer.currency}</span>
                    </div>
                  </div>
                  <PrimaryButton
                    onClick={() => onSelect(offer)}
                    icon={<ChevronRight size={18} />}
                    className="text-sm px-5 py-3"
                  >
                    Select
                  </PrimaryButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {sortedOffers.length === 0 && (
            <div className="text-center py-16">
              <Plane size={48} color="#2D3B55" className="mx-auto mb-4" />
              <p className="text-base font-semibold text-white">No flights found</p>
              <p className="text-sm text-[#94A3B8] mt-1">Try different dates or routes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}