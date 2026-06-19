import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Plane, MapPin, Calendar, Search, DollarSign, CheckCircle, Check, ChevronRight } from "lucide-react";
import { api } from "../../services/api";
import type { RescheduleOffer } from "../../types";

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

export default function RescheduleScreen({
  bookingId,
  currentDate,
  onComplete,
  onBack,
}: {
  bookingId: string;
  currentDate: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"date" | "searching" | "offers" | "processing" | "success">("date");
  const [newDate, setNewDate] = useState("");
  const [offers, setOffers] = useState<RescheduleOffer[]>([]);
  const [error, setError] = useState("");
  const [offerCount, setOfferCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the date input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSearch = async () => {
    if (!newDate.trim()) {
      setError("Please enter a new date");
      return;
    }
    setError("");
    setStep("searching");
    try {
      const result = await api.rescheduleSearch(bookingId, newDate.trim());
      setOffers(result.change_offers || []);
      setOfferCount(result.offer_count || 0);
      setStep("offers");
    } catch (err: any) {
      setError(err.message || "Failed to search reschedule options");
      setStep("date");
    }
  };

  const handleSelectOffer = async (offer: RescheduleOffer) => {
    setStep("processing");
    setError("");
    try {
      await api.rescheduleConfirm(bookingId, offer.offer_id);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to confirm reschedule");
      setStep("offers");
    }
  };

  const speakOffers = useCallback(async (offers: RescheduleOffer[]) => {
    if (offers.length === 0) return;
    const summary = `Found ${offers.length} reschedule options. ` +
      offers.map((o, i) =>
        `${i + 1}: ${o.airline}, flight ${o.flight_number}, ` +
        `new price ${o.price} ${o.currency}, penalty ${o.penalty_amount}, total ${o.change_total}.`
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
  }, []);

  useEffect(() => {
    if (step === "offers" && offers.length > 0) {
      const timer = setTimeout(() => speakOffers(offers), 400);
      return () => clearTimeout(timer);
    }
  }, [step, offers, speakOffers]);

  useEffect(() => {
    if (step === "success") {
      api.speak(`Rescheduled! Your flight has been moved to ${formatDate(newDate)}.`)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          audio.play().catch(() => {});
        })
        .catch(() => {});
    }
  }, [step, newDate]);

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
        <h1 className="text-lg font-bold text-white">Reschedule Flight</h1>
      </div>

      <div className="px-5 py-4 space-y-4 pb-28">
        {/* Step 1: Date input */}
        {step === "date" && (
          <>
            {/* Current booking info */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Plane size={18} color="#4F46E5" />
                <p className="text-sm font-semibold text-white">Current Booking</p>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(79,70,229,0.15)" }}
                >
                  <MapPin size={18} color="#4F46E5" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">Booking #{bookingId.slice(0, 8)}</p>
                  <p className="text-xs text-[#94A3B8]">Current date: {formatDate(currentDate)}</p>
                </div>
              </div>
            </GlassCard>

            {/* Date input */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Choose a new date</p>
              <input
                ref={inputRef}
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="YYYY-MM-DD"
                className="w-full rounded-2xl px-5 py-5 text-xl text-white text-center placeholder-[#64748B] border border-white/8 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent font-mono tracking-widest"
                style={{ background: "rgba(21,28,47,0.7)" }}
                autoFocus
              />
              <p className="text-xs text-[#64748B] mt-2 text-center">Enter date in YYYY-MM-DD format</p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Search button */}
            <PrimaryButton
              onClick={handleSearch}
              disabled={!newDate.trim()}
              icon={<Search size={22} />}
              className="w-full mt-2 py-5 text-lg"
            >
              Search New Dates
            </PrimaryButton>
          </>
        )}

        {/* Step 1.5: Searching */}
        {step === "searching" && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-base font-semibold text-white">Searching reschedule options...</p>
            <p className="text-sm text-[#94A3B8]">for {newDate}</p>
          </div>
        )}

        {/* Step 2: Offers */}
        {step === "offers" && (
          <>
            {/* Count */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)", color: "#fff" }}
              >
                {offerCount || offers.length}
              </span>
              <span className="text-sm font-semibold text-white">
                reschedule {offers.length === 1 ? "option" : "options"} available
              </span>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Offer cards */}
            <div className="space-y-3">
              {offers.map((offer, index) => (
                <motion.div
                  key={offer.offer_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <GlassCard className="p-5">
                    {/* Airline + Flight */}
                    <div className="flex items-center gap-2 mb-3">
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

                    {/* Times */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/8">
                      <div>
                        <p className="text-xs text-[#94A3B8]">Departure</p>
                        <p className="text-sm font-semibold text-white">{offer.departure_time || "N/A"}</p>
                      </div>
                      <Calendar size={14} color="#64748B" />
                      <div className="text-right">
                        <p className="text-xs text-[#94A3B8]">Arrival</p>
                        <p className="text-sm font-semibold text-white">{offer.arrival_time || "N/A"}</p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#94A3B8]">New price</span>
                        <span className="text-sm font-semibold text-white">{offer.price} {offer.currency}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#94A3B8]">Penalty fee</span>
                        <span className="text-sm font-semibold text-red-400">{offer.penalty_amount} {offer.currency}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/8">
                        <span className="text-xs font-semibold text-white">Change total</span>
                        <span className="text-base font-extrabold text-[#22C55E]">{offer.change_total} {offer.currency}</span>
                      </div>
                    </div>

                    {/* Select button */}
                    <PrimaryButton
                      onClick={() => handleSelectOffer(offer)}
                      icon={<ChevronRight size={18} />}
                      className="w-full"
                    >
                      Select
                    </PrimaryButton>
                  </GlassCard>
                </motion.div>
              ))}

              {offers.length === 0 && (
                <div className="text-center py-10">
                  <Calendar size={40} color="#2D3B55" className="mx-auto mb-3" />
                  <p className="text-base font-semibold text-white">No reschedule options found</p>
                  <p className="text-sm text-[#94A3B8] mt-1">Try a different date</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-4 text-sm font-medium text-[#4F46E5] underline focus:outline-none"
                  >
                    Choose another date
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-base font-semibold text-white">Confirming reschedule...</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="flex flex-col items-center py-10">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.05))",
                border: "3px solid rgba(34,197,94,0.3)",
                boxShadow: "0 0 60px rgba(34,197,94,0.2)",
              }}
            >
              <CheckCircle size={56} color="#22C55E" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-4">✅ Rescheduled!</h2>
            <GlassCard className="p-5 w-full mb-8">
              <div className="flex items-center gap-3">
                <Calendar size={20} color="#4F46E5" />
                <div>
                  <p className="text-sm text-[#94A3B8]">New date</p>
                  <p className="text-base font-bold text-white">{formatDate(newDate)}</p>
                </div>
              </div>
            </GlassCard>

            <PrimaryButton onClick={onComplete} className="w-full">
              Done
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}