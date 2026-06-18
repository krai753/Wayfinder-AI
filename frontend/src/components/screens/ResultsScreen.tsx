/**
 * ResultsScreen — displays flight offers sorted by price.
 *
 * - Auto-reads the cheapest option aloud when results load
 * - Highlights cheapest in green
 * - Each card has select button (60px+) and read-aloud button
 * - Tapping a card selects it and advances to passenger screen
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Plane,
  Clock,
  Check,
  Volume2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { NavFn } from "../../types";
import {
  formatDuration,
  formatPrice,
  formatTime,
  parseDurationToMinutes,
  priceNumber,
  stopLabel,
  formatDateSpoken,
} from "../../lib/format";
import type { FlightOffer } from "../../types";

interface ResultsScreenProps {
  navigate: NavFn;
}

export function ResultsScreen({ navigate }: ResultsScreenProps) {
  const {
    origin,
    destination,
    departureDate,
    offers,
    cheapestOffer,
    selectedOffer,
    setSelectedOffer,
    searchFlights,
    loading,
    error,
  } = useWizard();
  const [spokenOnce, setSpokenOnce] = useState(false);

  // Auto-speak cheapest on first render
  useEffect(() => {
    if (spokenOnce || offers.length === 0 || !cheapestOffer) return;
    setSpokenOnce(true);
    const c = cheapestOffer;
    const text =
      `I found ${offers.length} flights from ${origin?.city} to ${destination?.city} on ${formatDateSpoken(departureDate || "")}. ` +
      `The cheapest is ${c.airline} flight ${c.flight_number}, departing at ${formatTime(c.departure_time)}, ` +
      `arriving at ${formatTime(c.arrival_time)}, ${formatDuration(parseDurationToMinutes(c.duration))}, ` +
      `${stopLabel(c.stops)}, for ${formatPrice(c.price, c.currency)}.`;
    speak({ text });
  }, [spokenOnce, offers, cheapestOffer, origin, destination, departureDate]);

  // If we land here without a search, kick one off
  useEffect(() => {
    if (offers.length === 0 && !loading && !error && origin && destination && departureDate) {
      searchFlights().catch(() => {});
    }
  }, [offers.length, loading, error, origin, destination, departureDate, searchFlights]);

  function handleSelect(o: FlightOffer) {
    setSelectedOffer(o);
    const c = o;
    speak({
      text: `Selected ${c.airline} flight ${c.flight_number} for ${formatPrice(c.price, c.currency)}.`,
    });
    navigate("passenger");
  }

  function handleReadAll() {
    if (offers.length === 0) return;
    const summaries = offers.slice(0, 5).map((o, i) => {
      return `Option ${i + 1}: ${o.airline} flight ${o.flight_number}, ${formatTime(o.departure_time)} to ${formatTime(o.arrival_time)}, ${stopLabel(o.stops)}, ${formatPrice(o.price, o.currency)}.`;
    });
    speak({ text: summaries.join(" ") });
  }

  async function handleRefresh() {
    setSpokenOnce(false);
    try {
      await searchFlights();
    } catch {}
  }

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
            onClick={() => navigate("dates")}
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
            <h1 className="text-xl font-extrabold text-white">Available flights</h1>
            <p className="text-sm text-slate-400 truncate">
              {origin?.city} ({origin?.iata}) → {destination?.city} ({destination?.iata}) •{" "}
              {departureDate ? formatDateSpoken(departureDate) : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh results"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            "
          >
            <RefreshCw size={22} color="#fff" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Read all button */}
        {offers.length > 0 && (
          <button
            type="button"
            onClick={handleReadAll}
            className="
              w-full h-[60px] rounded-2xl
              flex items-center justify-center gap-3
              bg-indigo-500/15 hover:bg-indigo-500/25
              border border-indigo-400/30
              text-white font-semibold text-base
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              active:scale-[0.98] transition-all
            "
          >
            <Volume2 size={22} aria-hidden="true" />
            <span>Read all flights aloud</span>
          </button>
        )}

        {/* Loading */}
        {loading && offers.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" aria-hidden="true" />
            <p className="text-base text-slate-300 mt-4">Searching the best flights for you…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30 flex items-start gap-3">
            <AlertCircle size={22} className="text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-base text-red-100 font-semibold">Search failed</p>
              <p className="text-sm text-red-200/80 mt-0.5">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-red-400/60"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && offers.length === 0 && (
          <div className="text-center py-16">
            <Plane size={48} className="text-slate-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-lg text-white font-semibold">No flights found</p>
            <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
              Try a different date or airports.
            </p>
          </div>
        )}

        {/* Flight cards */}
        {offers.map((o, idx) => {
          const isCheapest = idx === 0;
          const isSelected = selectedOffer?.id === o.id;
          const minutes = parseDurationToMinutes(o.duration);
          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <FlightOfferCard
                offer={o}
                isCheapest={isCheapest}
                isSelected={isSelected}
                minutes={minutes}
                onSelect={() => handleSelect(o)}
                onReadAloud={() =>
                  speak({
                    text: `${o.airline} flight ${o.flight_number}, departing ${formatTime(o.departure_time)}, arriving ${formatTime(o.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(o.stops)}, ${formatPrice(o.price, o.currency)}.`,
                  })
                }
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface FlightOfferCardProps {
  offer: FlightOffer;
  isCheapest: boolean;
  isSelected: boolean;
  minutes: number;
  onSelect: () => void;
  onReadAloud: () => void;
}

function FlightOfferCard({
  offer,
  isCheapest,
  isSelected,
  minutes,
  onSelect,
  onReadAloud,
}: FlightOfferCardProps) {
  const price = priceNumber(offer.price);
  return (
    <GlassCard
      className={`p-5 ${isCheapest ? "ring-2 ring-emerald-400/40 border-emerald-400/40" : ""} ${isSelected ? "ring-2 ring-indigo-400/60" : ""}`}
      selected={isSelected}
      onClick={onSelect}
      ariaLabel={`${offer.airline} flight ${offer.flight_number}, ${formatTime(offer.departure_time)} to ${formatTime(offer.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(offer.stops)}, ${formatPrice(offer.price, offer.currency)}${isCheapest ? ". Cheapest option." : ""}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
          aria-hidden="true"
        >
          <Plane size={20} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white truncate">{offer.airline}</p>
          <p className="text-sm text-slate-400 truncate">Flight {offer.flight_number}</p>
        </div>
        {isCheapest && (
          <Badge color="green" icon={<Sparkles size={12} />}>
            Cheapest
          </Badge>
        )}
        {isSelected && (
          <Badge color="indigo" icon={<Check size={12} />}>
            Selected
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
            Departure
          </p>
          <p className="text-2xl font-extrabold text-white">
            {formatTime(offer.departure_time)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
            Arrival
          </p>
          <p className="text-2xl font-extrabold text-white">
            {formatTime(offer.arrival_time)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock size={16} className="text-slate-400" aria-hidden="true" />
          <span>{formatDuration(minutes)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plane size={16} className="text-slate-400" aria-hidden="true" />
          <span>{stopLabel(offer.stops)}</span>
        </div>
        <div>
          <span className="px-2 py-0.5 rounded-full bg-white/8 text-xs font-semibold text-slate-300">
            {offer.cabin_class}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/8">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Price</p>
          <p className="text-3xl font-extrabold text-white">
            {formatPrice(offer.price, offer.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReadAloud();
            }}
            aria-label="Read this flight aloud"
            className="
              w-[60px] h-[60px] rounded-full
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
            "
          >
            <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="
              min-h-[60px] px-6 rounded-2xl
              flex items-center justify-center gap-2
              font-bold text-white text-base
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
              active:scale-[0.97] transition-all
            "
            style={{
              background: "linear-gradient(135deg,#4F46E5,#6366f1)",
              boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
            }}
          >
            <span>Select</span>
            <Check size={20} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
