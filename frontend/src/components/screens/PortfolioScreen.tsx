import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plane, MapPin, DollarSign, Calendar, XCircle, Volume2, TrendingUp } from "lucide-react";
import { api } from "../../services/api";
import type { PortfolioResult } from "../../types";

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

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  badge?: { text: string; color: "indigo" | "green" | "amber" | "red" | "blue" };
}

function StatItem({ icon, label, value, badge }: StatItemProps) {
  return (
    <GlassCard className="p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(79,70,229,0.15)" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#94A3B8] truncate">{label}</p>
        <p className="text-xl font-extrabold text-white truncate">{value}</p>
      </div>
      {badge && <Badge color={badge.color}>{badge.text}</Badge>}
    </GlassCard>
  );
}

export default function PortfolioScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [portfolio, setPortfolio] = useState<PortfolioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getPortfolio("user_1");
      setPortfolio(result);
    } catch (err: any) {
      setError(err.message || "Failed to load travel stats");
    } finally {
      setLoading(false);
    }
  };

  const handleReadStats = useCallback(async () => {
    if (!portfolio) return;
    setSpeaking(true);
    const text = `Your travel portfolio. ` +
      `Total trips: ${portfolio.total_trips}. ` +
      `Total spent: ${portfolio.total_spent}. ` +
      `Favourite route: ${portfolio.favorite_route || "N/A"}. ` +
      `Upcoming trips: ${Array.isArray(portfolio.upcoming_trips) ? portfolio.upcoming_trips.length : portfolio.upcoming_trips || 0}. ` +
      `Cancelled: ${portfolio.cancelled_count}.`;
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
  }, [portfolio]);

  useEffect(() => {
    if (!loading && portfolio) {
      const timer = setTimeout(() => handleReadStats(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, portfolio]);

  const upcomingCount = Array.isArray(portfolio?.upcoming_trips)
    ? portfolio.upcoming_trips.length
    : (portfolio?.upcoming_trips ?? 0);

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
        <h1 className="text-lg font-bold text-white">Travel Stats</h1>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-sm text-[#94A3B8]">Loading your stats...</p>
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
              onClick={loadPortfolio}
              className="mt-3 text-xs font-medium text-[#4F46E5] underline focus:outline-none"
            >
              Tap to retry
            </button>
          </div>
        )}

        {/* Stats */}
        {!loading && portfolio && (
          <>
            {/* Total Trips - Hero stat */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard className="p-6 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(99,102,241,0.05))" }}
                >
                  <TrendingUp size={32} color="#4F46E5" />
                </div>
                <p className="text-4xl font-extrabold text-white mb-1">{portfolio.total_trips}</p>
                <p className="text-sm text-[#94A3B8]">Total Trips</p>
              </GlassCard>
            </motion.div>

            {/* Stat items */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <StatItem
                icon={<DollarSign size={22} color="#22C55E" />}
                label="Total Spent"
                value={portfolio.total_spent || "£0"}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <StatItem
                icon={<MapPin size={22} color="#A5B4FC" />}
                label="Favourite Route"
                value={portfolio.favorite_route || "N/A"}
                badge={{ text: "Top", color: "amber" }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <StatItem
                icon={<Calendar size={22} color="#22C55E" />}
                label="Upcoming Trips"
                value={upcomingCount}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <StatItem
                icon={<XCircle size={22} color="#EF4444" />}
                label="Cancelled"
                value={portfolio.cancelled_count}
                badge={{ text: portfolio.cancelled_count > 0 ? "Oh no!" : "Clean", color: portfolio.cancelled_count > 0 ? "red" : "green" }}
              />
            </motion.div>

            {/* TTS Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <button
                onClick={handleReadStats}
                disabled={speaking}
                className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-3 text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.1)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                <Volume2 size={18} />
                {speaking ? "Speaking..." : "🔊 Read Stats"}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}