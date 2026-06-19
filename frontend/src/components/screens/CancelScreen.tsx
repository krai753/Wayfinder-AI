import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle, DollarSign } from "lucide-react";
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

export default function CancelScreen({
  bookingId,
  onComplete,
  onBack,
}: {
  bookingId: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"loading" | "confirm" | "processing" | "success">("loading");
  const [cancellationId, setCancellationId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundCurrency, setRefundCurrency] = useState("GBP");
  const [error, setError] = useState("");

  useEffect(() => {
    initiateCancel();
  }, [bookingId]);

  const initiateCancel = async () => {
    setError("");
    try {
      const result = await api.cancelBooking(bookingId);
      setCancellationId(result.cancellation_id);
      setRefundAmount(result.refund_amount);
      setRefundCurrency(result.refund_currency || "GBP");
      setStep("confirm");
    } catch (err: any) {
      setError(err.message || "Failed to get cancellation info");
      setStep("confirm");
    }
  };

  const handleConfirmCancel = async () => {
    setStep("processing");
    setError("");
    try {
      await api.confirmCancellation(bookingId, cancellationId);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to cancel booking");
      setStep("confirm");
    }
  };

  const speakRefund = useCallback(async (amount: string, currency: string) => {
    try {
      const blob = await api.speak(`You will get ${currency} ${amount} back. Tap confirm to cancel your booking.`);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});
    } catch {
      // TTS error — non-critical
    }
  }, []);

  useEffect(() => {
    if (step === "confirm" && refundAmount) {
      const timer = setTimeout(() => speakRefund(refundAmount, refundCurrency), 300);
      return () => clearTimeout(timer);
    }
  }, [step, refundAmount, refundCurrency, speakRefund]);

  useEffect(() => {
    if (step === "success") {
      const text = `Cancelled! Refund: ${refundCurrency} ${refundAmount}`;
      api.speak(text)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          audio.play().catch(() => {});
        })
        .catch(() => {});
    }
  }, [step, refundAmount, refundCurrency]);

  const displayAmount = refundAmount ? `${refundCurrency} ${refundAmount}` : "—";

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
        <h1 className="text-lg font-bold text-white">Cancel Booking</h1>
      </div>

      <div className="px-5 py-8 space-y-6">
        {/* Step 0: Initial loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-10 h-10 rounded-full animate-spin"
              style={{ border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#4F46E5" }}
            />
            <p className="text-sm text-[#94A3B8]">Checking cancellation options...</p>
          </div>
        )}

        {/* Step 1: Confirm */}
        {step === "confirm" && (
          <>
            {/* Warning */}
            <GlassCard className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.12)" }}
              >
                <AlertTriangle size={32} color="#EF4444" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Are you sure?</h2>
              <p className="text-sm text-[#94A3B8] mb-4">
                This action cannot be undone. Your booking will be cancelled.
              </p>
              <div
                className="rounded-xl p-4 mb-2"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
              >
                <div className="flex items-center justify-center gap-2">
                  <DollarSign size={20} color="#22C55E" />
                  <span className="text-lg font-bold text-white">You'll get {displayAmount} back</span>
                </div>
              </div>
            </GlassCard>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={handleConfirmCancel}
              className="flex items-center justify-center gap-2 w-full rounded-2xl px-6 py-5 font-bold text-white text-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0B1020]"
              style={{ background: "linear-gradient(135deg,#DC2626,#EF4444)" }}
            >
              ❌ Yes, Cancel
            </button>
          </>
        )}

        {/* Step 1.5: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: "3px solid rgba(239,68,68,0.2)", borderTopColor: "#EF4444" }}
            />
            <p className="text-sm text-[#94A3B8]">Cancelling your booking...</p>
          </div>
        )}

        {/* Step 2: Success */}
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
            <h2 className="text-2xl font-extrabold text-white mb-2">✅ Cancelled!</h2>
            <div
              className="rounded-xl px-6 py-3 mb-8"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <DollarSign size={20} color="#22C55E" />
                <span className="text-lg font-bold text-white">Refund: {displayAmount}</span>
              </div>
            </div>

            <PrimaryButton onClick={onComplete} className="w-full max-w-sm">
              Done
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}