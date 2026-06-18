/**
 * PortfolioScreen — personal travel stats.
 *
 * - Total trips, total spent, favourite route, upcoming trips, cancelled
 * - All read aloud on mount
 * - Large stat cards, easy to scan by touch / VoiceOver
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Volume2, Plane, TrendingUp, MapPin, Calendar, X, RefreshCw } from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak } from "../../hooks/useSpeech";
import { api } from "../../services/api";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";

interface PortfolioScreenProps {
  navigate: NavFn;
}

export function PortfolioScreen({ navigate }: PortfolioScreenProps) {
  const { userId, profile } = useUser();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPortfolio(userId);
      setStats(res);
      const t = res.total_trips || 0;
      const s = res.total_spent || "0";
      const fav = res.favorite_route || "no favourite yet";
      const cancelled = res.cancelled_count || 0;
      const upcoming = res.upcoming_trips?.length || 0;
      speak({
        text: `Travel stats for ${profile.name}. ${t} total trips. ${upcoming} upcoming. Total spent £${s}. Favourite route ${fav}. ${cancelled} cancelled.`,
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReadAll() {
    if (!stats) return;
    speak({
      text: `${stats.total_trips || 0} total trips. Total spent £${stats.total_spent || "0"}. ` +
        `Favourite route ${stats.favorite_route || "none yet"}. ` +
        `${stats.upcoming_trips?.length || 0} upcoming. ${stats.cancelled_count || 0} cancelled.`,
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
            onClick={() => navigate("profile")}
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
            <h1 className="text-xl font-extrabold text-white">Travel stats</h1>
            <p className="text-sm text-slate-400">{profile.name}'s portfolio</p>
          </div>
          <button
            type="button"
            onClick={handleReadAll}
            aria-label="Read all stats aloud"
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
        {loading && !stats && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-3 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" aria-hidden="true" />
            <p className="text-base text-slate-300 mt-4">Loading your stats…</p>
          </div>
        )}
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30">
            <p className="text-sm text-red-100">{error}</p>
            <PrimaryButton
              onClick={load}
              variant="secondary"
              size="md"
              icon={<RefreshCw size={18} />}
              className="mt-3"
            >
              Try again
            </PrimaryButton>
          </div>
        )}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Plane size={22} className="text-indigo-300" aria-hidden="true" />}
                label="Total trips"
                value={String(stats.total_trips || 0)}
                spoken={`${stats.total_trips || 0} total trips`}
              />
              <StatCard
                icon={<TrendingUp size={22} className="text-emerald-300" aria-hidden="true" />}
                label="Total spent"
                value={`£${stats.total_spent || "0"}`}
                spoken={`Total spent ${stats.total_spent || 0} pounds`}
              />
              <StatCard
                icon={<MapPin size={22} className="text-amber-300" aria-hidden="true" />}
                label="Favourite route"
                value={stats.favorite_route || "—"}
                small
                spoken={`Favourite route: ${stats.favorite_route || "none yet"}`}
              />
              <StatCard
                icon={<Calendar size={22} className="text-cyan-300" aria-hidden="true" />}
                label="Upcoming"
                value={String(stats.upcoming_trips?.length || 0)}
                spoken={`${stats.upcoming_trips?.length || 0} upcoming trips`}
              />
              <StatCard
                icon={<X size={22} className="text-red-300" aria-hidden="true" />}
                label="Cancelled"
                value={String(stats.cancelled_count || 0)}
                spoken={`${stats.cancelled_count || 0} cancelled bookings`}
              />
            </div>

            {stats.upcoming_trips && stats.upcoming_trips.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Upcoming trips
                </h2>
                <div className="space-y-2">
                  {stats.upcoming_trips.slice(0, 3).map((t: any) => (
                    <GlassCard
                      key={t.id}
                      className="p-4"
                      onClick={() => navigate("tripDetail", { bookingId: t.id })}
                      ariaLabel={`Upcoming trip from ${t.origin} to ${t.destination} on ${t.departure_date}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(79,70,229,0.18)" }}
                          aria-hidden="true"
                        >
                          <Plane size={18} className="text-indigo-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-white">
                            {t.origin} → {t.destination}
                          </p>
                          <p className="text-sm text-slate-400">{t.departure_date}</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            <PrimaryButton
              onClick={() => navigate("bookings")}
              variant="secondary"
              size="lg"
              icon={<Plane size={20} />}
              className="w-full"
            >
              View all trips
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  spoken,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  spoken: string;
  small?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <GlassCard
        className={`p-4 ${small ? "col-span-2" : ""}`}
        onClick={() => speak({ text: spoken })}
        ariaLabel={`${label}: ${value}. Tap to read aloud.`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-hidden="true"
          >
            {icon}
          </div>
          <Volume2 size={14} className="text-slate-500" aria-hidden="true" />
        </div>
        <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
          {label}
        </p>
        <p
          className={`font-extrabold text-white mt-1 ${small ? "text-xl" : "text-3xl"} truncate`}
        >
          {value}
        </p>
      </GlassCard>
    </motion.div>
  );
}
