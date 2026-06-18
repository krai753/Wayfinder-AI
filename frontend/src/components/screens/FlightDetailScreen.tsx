/**
 * FlightDetailScreen — single flight detail view.
 * For now, it shows the selected offer with extra context. Could be expanded.
 */
import { ArrowLeft, Volume2, Plane, Clock, Calendar, Check } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";
import {
  formatDateSpoken,
  formatDuration,
  formatPrice,
  formatTime,
  parseDurationToMinutes,
  stopLabel,
} from "../../lib/format";

interface FlightDetailScreenProps {
  navigate: NavFn;
}

export function FlightDetailScreen({ navigate }: FlightDetailScreenProps) {
  const { selectedOffer, setSelectedOffer, origin, destination, departureDate } = useWizard();

  if (!selectedOffer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8" style={{ background: "#0B1020" }}>
        <p className="text-lg text-white">No flight selected</p>
        <PrimaryButton onClick={() => navigate("results")} className="mt-4">
          View flights
        </PrimaryButton>
      </div>
    );
  }

  const o = selectedOffer;
  const minutes = parseDurationToMinutes(o.duration);

  function handleRead() {
    speak({
      text: `${o.airline} flight ${o.flight_number}, from ${origin?.city} to ${destination?.city}, on ${formatDateSpoken(departureDate || "")}. Departing ${formatTime(o.departure_time)}, arriving ${formatTime(o.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(o.stops)}. ${formatPrice(o.price, o.currency)}.`,
    });
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
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
            onClick={() => navigate("results")}
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
            <h1 className="text-xl font-extrabold text-white">Flight details</h1>
            <p className="text-sm text-slate-400 truncate">{o.airline}</p>
          </div>
          <button
            type="button"
            onClick={handleRead}
            aria-label="Read flight details aloud"
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
        <GlassCard className="p-6 text-center">
          <div className="flex items-center gap-3 justify-center mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
              aria-hidden="true"
            >
              <Plane size={22} color="#fff" />
            </div>
            <p className="text-2xl font-extrabold text-white">{o.airline}</p>
          </div>
          <p className="text-sm text-slate-400">Flight {o.flight_number}</p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                Departure
              </p>
              <p className="text-3xl font-extrabold text-white">
                {formatTime(o.departure_time)}
              </p>
              <p className="text-sm text-slate-300 mt-1">{origin?.city}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                Arrival
              </p>
              <p className="text-3xl font-extrabold text-white">
                {formatTime(o.arrival_time)}
              </p>
              <p className="text-sm text-slate-300 mt-1">{destination?.city}</p>
            </div>
          </div>
          <div className="flex items-center justify-around text-sm text-slate-300 pt-4 border-t border-white/8">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" aria-hidden="true" />
              <span>{formatDateSpoken(departureDate || "")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" aria-hidden="true" />
              <span>{formatDuration(minutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-slate-400" aria-hidden="true" />
              <span>{stopLabel(o.stops)}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-wider font-bold text-slate-400">Total</p>
            <p className="text-3xl font-extrabold text-white">
              {formatPrice(o.price, o.currency)}
            </p>
          </div>
        </GlassCard>

        <PrimaryButton
          onClick={() => {
            setSelectedOffer(o);
            navigate("passenger");
          }}
          size="xl"
          icon={<Check size={22} />}
          className="w-full"
        >
          Select this flight
        </PrimaryButton>
      </div>
    </div>
  );
}
