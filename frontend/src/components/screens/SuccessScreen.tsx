import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, Plane, Home, DollarSign, Copy, Check } from "lucide-react";
import { api } from "../../services/api";

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

export default function SuccessScreen({
  booking,
  onDone,
}: {
  booking: {
    booking_reference?: string;
    total_amount?: string;
    origin?: string;
    destination?: string;
    departure_date?: string;
  };
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const text = `Booking confirmed! Reference: ${booking.booking_reference || "N/A"}. ` +
      `Total: ${booking.total_amount || "N/A"}. ` +
      `Flight from ${booking.origin || "N/A"} to ${booking.destination || "N/A"} on ${booking.departure_date || "N/A"}. ` +
      `Your flight is booked!`;
    api.speak(text)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }, [booking]);

  const handleCopy = () => {
    if (booking.booking_reference) {
      navigator.clipboard.writeText(booking.booking_reference).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "radial-gradient(ellipse at center, #1a1f3e 0%, #0B1020 60%)" }}
    >
      {/* Checkmark animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="mb-6"
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.05))",
            border: "3px solid rgba(34,197,94,0.3)",
            boxShadow: "0 0 60px rgba(34,197,94,0.2)",
          }}
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CheckCircle size={64} color="#22C55E" />
          </motion.div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-extrabold text-white mb-6"
      >
        ✅ Booking Confirmed!
      </motion.h1>

      {/* Booking details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm space-y-4 mb-8"
      >
        <GlassCard className="p-6">
          <div className="space-y-4">
            {/* Reference */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#94A3B8]">Reference</span>
              <div className="flex items-center gap-2">
                <Badge color="green">{booking.booking_reference || "N/A"}</Badge>
                <button
                  onClick={handleCopy}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {copied ? <Check size={14} color="#22C55E" /> : <Copy size={14} color="#94A3B8" />}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <span className="text-sm text-[#94A3B8]">Amount</span>
              <div className="flex items-center gap-1">
                <DollarSign size={16} color="#22C55E" />
                <span className="text-xl font-extrabold text-white">{booking.total_amount || "N/A"}</span>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(79,70,229,0.15)" }}
              >
                <Plane size={20} color="#4F46E5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {booking.origin || "Origin"} → {booking.destination || "Destination"}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Your flight is booked!
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Confirmation text */}
        <p className="text-center text-sm text-[#94A3B8]">
          Your flight from {booking.origin || "N/A"} to {booking.destination || "N/A"} is booked!
        </p>
      </motion.div>

      {/* Done button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="w-full max-w-sm"
      >
        <PrimaryButton onClick={onDone} icon={<Home size={20} />} className="w-full">
          Done
        </PrimaryButton>
      </motion.div>
    </div>
  );
}