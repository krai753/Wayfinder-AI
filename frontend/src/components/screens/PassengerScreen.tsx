import { useState, useRef, useEffect } from "react";
import { ArrowLeft, User, Eye, Accessibility, Check, Wheelchair } from "lucide-react";
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

const ASSISTANCE_OPTIONS = [
  { value: "none", label: "None", icon: <User size={22} />, color: "green" },
  { value: "visual", label: "Visual Assistance", icon: <Eye size={22} />, color: "blue" },
  { value: "wheelchair", label: "Wheelchair", icon: <Wheelchair size={22} />, color: "amber" },
] as const;

export default function PassengerScreen({
  sessionId,
  onComplete,
  onBack,
}: {
  sessionId: string;
  onComplete: (name: string, assistance: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [assistance, setAssistance] = useState("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the name input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.wizardPassenger(sessionId, trimmed, assistance);
      onComplete(trimmed, assistance);
    } catch (err: any) {
      setError(err.message || "Failed to save passenger info");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-lg font-bold text-white">Passenger Details</h1>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === 2
                    ? "text-white"
                    : step < 2
                    ? "text-white"
                    : "text-[#64748B]"
                }`}
                style={{
                  background: step <= 2
                    ? "linear-gradient(135deg,#4F46E5,#6366f1)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                {step < 2 ? <Check size={16} /> : step}
              </div>
              {step < 4 && (
                <div
                  className="w-8 h-0.5 rounded-full"
                  style={{ background: step < 2 ? "#4F46E5" : "rgba(255,255,255,0.06)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Name Input */}
        <div>
          <p className="text-sm font-semibold text-white mb-2">What is your name?</p>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="Enter passenger name"
            className="w-full rounded-2xl px-5 py-5 text-lg text-white placeholder-[#64748B] border border-white/8 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
            style={{ background: "rgba(21,28,47,0.7)" }}
            autoFocus
          />
        </div>

        {/* Assistance Selection */}
        <div>
          <p className="text-sm font-semibold text-white mb-3">Do you need any assistance?</p>
          <div className="grid grid-cols-1 gap-3">
            {ASSISTANCE_OPTIONS.map((opt) => {
              const isSelected = assistance === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setAssistance(opt.value)}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                    isSelected ? "border" : "border"
                  }`}
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(99,102,241,0.1))"
                      : "rgba(21,28,47,0.7)",
                    border: isSelected
                      ? "1px solid rgba(79,70,229,0.4)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected ? "opacity-100" : "opacity-60"
                    }`}
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg,#4F46E5,#6366f1)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-base font-semibold ${isSelected ? "text-white" : "text-white/80"}`}>
                      {opt.label}
                    </p>
                  </div>
                  {isSelected && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#6366f1)" }}
                    >
                      <Check size={16} color="#fff" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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

        {/* Confirm Button */}
        <PrimaryButton
          onClick={handleConfirm}
          disabled={loading || !name.trim()}
          icon={loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
          className="w-full mt-2"
        >
          {loading ? "Saving..." : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}
