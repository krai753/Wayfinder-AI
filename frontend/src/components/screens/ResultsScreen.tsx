/**
 * ResultsScreen — flight offers, sorted by price.
 *
 * Refactored to premium quality:
 * - Hero "Read all aloud" action at the top
 * - Cheapest flight highlighted (emerald ring + 'Cheapest' badge)
 * - Doppelrand cards (Card component) for each offer
 * - "Select" Button with Button-in-Button trailing checkmark
 * - Massive departure/arrival times (4xl) for low-vision users
 * - Auto-reads cheapest option on arrival
 * - Empty state with friendly CTA
 * - Loading state with branded spinner
 * - All accessibility preserved
 */
import { useEffect, useState } from "react";
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
import { speak } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import {
  formatDuration,
  formatPrice,
  formatTime,
  parseDurationToMinutes,
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

  useEffect(() => {
    if (
      offers.length === 0 &&
      !loading &&
      !error &&
      origin &&
      destination &&
      departureDate
    ) {
      searchFlights().catch(() => {});
    }
  }, [offers.length, loading, error, origin, destination, departureDate, searchFlights]);

  function handleSelect(o: FlightOffer) {
    setSelectedOffer(o);
    speak({
      text: `Selected ${o.airline} flight ${o.flight_number} for ${formatPrice(o.price, o.currency)}.`,
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
            onClick={() => navigate("dates")}
            aria-label="Back"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] transition-colors"
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white" style={type.h3 as any}>
              Available flights
            </h1>
            <p className="text-slate-400 truncate" style={type.bodySm as any}>
              {origin?.city} ({origin?.iata}) → {destination?.city} ({destination?.iata}) •{" "}
              {departureDate ? formatDateSpoken(departureDate) : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh results"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 transition-colors"
          >
            <RefreshCw
              size={22}
              color="#fff"
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Hero — Read all aloud */}
        {offers.length > 0 && (
          <Button
            onClick={handleReadAll}
            variant="secondary"
            size="lg"
            icon={<Volume2 size={20} />}
            fullWidth
          >
            Read all flights aloud
          </Button>
        )}

        {/* Loading */}
        {loading && offers.length === 0 && (
          <div className="text-center py-20">
            <div
              className="inline-block w-12 h-12 border-[3px] border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"
              aria-hidden="true"
            />
            <p className="text-slate-300 mt-5" style={type.bodyLg as any}>
              Searching the best flights for you…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="p-5 rounded-2xl bg-red-500/10 border border-red-400/30 flex items-start gap-4"
          >
            <AlertCircle size={24} className="text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-red-100" style={{ ...type.bodyLg as any, fontWeight: 700 }}>
                Search failed
              </p>
              <p className="text-red-200/80 mt-1" style={type.bodySm as any}>
                {error}
              </p>
              <Button
                onClick={handleRefresh}
                variant="secondary"
                size="md"
                icon={<RefreshCw size={16} />}
                className="mt-4"
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && offers.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: "rgba(255, 255, 255, 0.04)" }}
              aria-hidden="true"
            >
              <Plane size={36} className="text-slate-500" />
            </div>
            <p className="text-white" style={{ ...type.h2 as any, fontWeight: 700 }}>
              No flights found
            </p>
            <p className="text-slate-400 mt-2 max-w-xs mx-auto" style={type.body as any}>
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
              transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
  return (
    <Card
      variant={isCheapest ? "success" : "default"}
      padding="lg"
      onClick={onSelect}
      selected={isSelected}
      ariaLabel={`${offer.airline} flight ${offer.flight_number}, ${formatTime(offer.departure_time)} to ${formatTime(offer.arrival_time)}, ${formatDuration(minutes)}, ${stopLabel(offer.stops)}, ${formatPrice(offer.price, offer.currency)}${isCheapest ? ". Cheapest option." : ""}`}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: isCheapest ? tokens.gradient.success : "rgba(255, 255, 255, 0.06)",
            boxShadow: isCheapest ? "0 6px 18px rgba(34,197,94,0.32)" : "none",
          }}
          aria-hidden="true"
        >
          <Plane size={20} color="#fff" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white" style={{ ...type.bodyLg as any, fontWeight: 700 }}>
            {offer.airline}
          </p>
          <p className="text-slate-400 truncate" style={type.bodySm as any}>
            Flight {offer.flight_number}
          </p>
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

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-slate-400 mb-1" style={type.eyebrow as any}>
            Departure
          </p>
          <p
            className="text-white"
            style={{ ...type.h as any1, fontSize: "2.25rem", letterSpacing: "-0.025em", fontWeight: 800 }}
          >
            {formatTime(offer.departure_time)}
          </p>
        </div>
        <div>
          <p className="text-slate-400 mb-1" style={type.eyebrow as any}>
            Arrival
          </p>
          <p
            className="text-white"
            style={{ ...type.h as any1, fontSize: "2.25rem", letterSpacing: "-0.025em", fontWeight: 800 }}
          >
            {formatTime(offer.arrival_time)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5 text-slate-300" style={type.bodySm as any}>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" aria-hidden="true" />
          <span>{formatDuration(minutes)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plane size={14} className="text-slate-400" aria-hidden="true" />
          <span>{stopLabel(offer.stops)}</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", ...type.caption as any }}
        >
          {offer.cabin_class}
        </span>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-white/[0.06]">
        <div>
          <p className="text-slate-400" style={type.eyebrow as any}>
            Price
          </p>
          <p
            className="text-white"
            style={{ ...type.h as any1, fontSize: "2rem", letterSpacing: "-0.02em" }}
          >
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
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
          >
            <Volume2 size={20} color="#A5B4FC" aria-hidden="true" />
          </button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            size="md"
            variant="primary"
            icon={<Check size={16} strokeWidth={3} />}
          >
            Select
          </Button>
        </div>
      </div>
    </Card>
  );
}
