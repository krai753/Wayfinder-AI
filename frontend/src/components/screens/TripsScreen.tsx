/**
 * TripsScreen — list of user's bookings (upcoming + past).
 *
 * - TTS reads the count and most recent trip on mount
 * - Upcoming trips shown first, then past
 * - Each trip is a large card with route, date, status, and Read-aloud button
 * - Tap a card to go to TripDetail
 */
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Bookmark, Volume2, Calendar, Plane, ChevronRight, RefreshCw } from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { Badge } from "../ui/Badge";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";
import { formatDateSpoken, formatTime, stopLabel } from "../../lib/format";
import type { BookingResult } from "../../types";

interface TripsScreenProps {
  navigate: NavFn;
}

export function TripsScreen({ navigate }: TripsScreenProps) {
  const { trips, loadingTrips, refreshTrips, profile } = useUser();

  const { upcoming, past } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const up: BookingResult[] = [];
    const p: BookingResult[] = [];
    for (const t of trips) {
      const isUpcoming =
        t.status === "confirmed" && t.departure_date && t.departure_date >= today;
      if (isUpcoming) up.push(t);
      else p.push(t);
    }
    return { upcoming: up, past: p };
  }, [trips]);

  useEffect(() => {
    if (loadingTrips) return;
    const total = trips.length;
    if (total === 0) {
      speak({
        text: `You have no trips yet, ${profile.name.split(" ")[0]}. Tap the home button to book one.`,
      });
    } else {
      const u = upcoming.length;
      const p = past.length;
      const last = trips[0];
      speak({
        text: `You have ${total} trips. ${u} upcoming, ${p} past. ` +
          (last ? `Most recent: from ${last.origin} to ${last.destination} on ${formatDateSpoken(last.departure_date)}.` : ""),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips.length, loadingTrips]);

  function handleReadTrip(t: BookingResult) {
    speak({
      text: `From ${t.origin} to ${t.destination}, on ${formatDateSpoken(t.departure_date)}. Status ${t.status}. Reference ${t.booking_reference || "pending"}. ${t.total_amount || ""}.`,
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
          <div
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-indigo-500/20 border border-indigo-400/30"
            aria-hidden="true"
          >
            <Bookmark size={26} color="#A5B4FC" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">My trips</h1>
            <p className="text-sm text-slate-400">
              {trips.length === 0
                ? "No trips yet"
                : `${upcoming.length} upcoming • ${past.length} past`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshTrips()}
            aria-label="Refresh trips"
            disabled={loadingTrips}
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={22}
              color="#fff"
              className={loadingTrips ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {loadingTrips && trips.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="inline-block w-10 h-10 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"
              aria-hidden="true"
            />
            <p className="text-base text-slate-300 mt-4">Loading your trips…</p>
          </div>
        ) : trips.length === 0 ? (
          <EmptyState onBook={() => navigate("voice")} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Section title="Upcoming" count={upcoming.length}>
                {upcoming.map((t) => (
                  <TripCard
                    key={t.id}
                    trip={t}
                    onClick={() => navigate("tripDetail", { bookingId: t.id })}
                    onReadAloud={() => handleReadTrip(t)}
                  />
                ))}
              </Section>
            )}
            {past.length > 0 && (
              <Section title="Past" count={past.length}>
                {past.map((t) => (
                  <TripCard
                    key={t.id}
                    trip={t}
                    onClick={() => navigate("tripDetail", { bookingId: t.id })}
                    onReadAloud={() => handleReadTrip(t)}
                  />
                ))}
              </Section>
            )}
          </>
        )}

        <PrimaryButton
          onClick={() => navigate("voice")}
          size="lg"
          icon={<Plane size={20} />}
          className="w-full"
        >
          Book a new flight
        </PrimaryButton>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
        {title} ({count})
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TripCard({
  trip,
  onClick,
  onReadAloud,
}: {
  trip: BookingResult;
  onClick: () => void;
  onReadAloud: () => void;
}) {
  const status = trip.status || "confirmed";
  const statusColor =
    status === "cancelled"
      ? "red"
      : status === "rescheduled"
        ? "amber"
        : "green";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard
        className="p-5"
        onClick={onClick}
        ariaLabel={`Trip from ${trip.origin} to ${trip.destination} on ${formatDateSpoken(trip.departure_date)}, status ${status}, reference ${trip.booking_reference || "pending"}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
            aria-hidden="true"
          >
            <Plane size={22} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-2xl font-extrabold text-white">
                {trip.origin} → {trip.destination}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Calendar size={14} aria-hidden="true" />
              <span>{formatDateSpoken(trip.departure_date)}</span>
            </div>
          </div>
          <Badge color={statusColor as any}>{status}</Badge>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-300 mb-3">
          <span className="font-mono text-slate-200">
            Ref: {trip.booking_reference || "—"}
          </span>
          {trip.total_amount && (
            <>
              <span aria-hidden="true">•</span>
              <span className="font-bold text-white">{trip.total_amount}</span>
            </>
          )}
        </div>

        {trip.flight_summary && (
          <p className="text-sm text-slate-400 truncate mb-3">{trip.flight_summary}</p>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-white/8">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReadAloud();
            }}
            aria-label="Read this trip aloud"
            className="
              flex-1 h-[52px] rounded-xl
              flex items-center justify-center gap-2
              bg-white/8 hover:bg-white/12 border border-white/10
              text-white text-sm font-semibold
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              active:scale-95 transition-all
            "
          >
            <Volume2 size={18} aria-hidden="true" />
            <span>Read aloud</span>
          </button>
          <div
            className="
              w-[52px] h-[52px] rounded-xl
              flex items-center justify-center
              bg-indigo-500/20 border border-indigo-400/30
            "
            aria-hidden="true"
          >
            <ChevronRight size={22} color="#A5B4FC" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function EmptyState({ onBook }: { onBook: () => void }) {
  return (
    <div className="text-center py-12">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: "rgba(79,70,229,0.15)" }}
        aria-hidden="true"
      >
        <Plane size={40} className="text-indigo-300" />
      </div>
      <p className="text-xl font-bold text-white mb-2">No trips yet</p>
      <p className="text-base text-slate-400 max-w-xs mx-auto mb-6">
        Book your first flight using voice or text. I'm here to help.
      </p>
      <PrimaryButton onClick={onBook} size="lg" icon={<Plane size={20} />}>
        Book a flight
      </PrimaryButton>
    </div>
  );
}
