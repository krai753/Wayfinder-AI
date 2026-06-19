/**
 * AccessibilityScreen — confirms the passenger's accessibility choices.
 * Acts as a final review before review/payment.
 * - Reads everything aloud when it opens
 * - Shows large "Edit" and "Looks good, continue" buttons
 */
import { useEffect } from "react";
import { ArrowLeft, Heart, Volume2, Check, Pencil, Accessibility } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { NavFn } from "../../types";

interface AccessibilityScreenProps {
  navigate: NavFn;
}

const ASSISTANCE_LABEL: Record<string, string> = {
  none: "No assistance needed",
  wheelchair: "Wheelchair assistance",
  visual: "Visual assistance (blind or visually impaired)",
};

const ASSISTANCE_SPOKEN: Record<string, string> = {
  none: "no assistance needed",
  wheelchair: "wheelchair assistance",
  visual: "visual assistance",
};

export function AccessibilityScreen({ navigate }: AccessibilityScreenProps) {
  const { passengerName, passengerAssistance } = useWizard();

  // Auto-speak the summary
  useEffect(() => {
    const text = `Accessibility: Passenger ${passengerName || "(not set)"}. ${ASSISTANCE_SPOKEN[passengerAssistance] || "no assistance needed"}.`;
    speak({ text });
  }, [passengerName, passengerAssistance]);

  function handleConfirm() {
    speak({ text: "Great, taking you to review your trip." });
    navigate("review");
  }

  function handleEdit() {
    navigate("passenger");
  }

  function handleRead() {
    const text = `Passenger ${passengerName || "(not set)"}. ${ASSISTANCE_SPOKEN[passengerAssistance] || "no assistance needed"}.`;
    speak({ text });
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
            onClick={() => navigate("passenger")}
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
            <h1 className="text-xl font-extrabold text-white">Accessibility</h1>
            <p className="text-sm text-slate-400">Confirm your assistance choices</p>
          </div>
          <button
            type="button"
            onClick={handleRead}
            aria-label="Read this page aloud"
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

      <div className="px-5 pt-4 space-y-5">
        <GlassCard className="p-5" ariaLabel="Accessibility summary">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
              aria-hidden="true"
            >
              <Accessibility size={22} color="#fff" />
            </div>
            <p className="text-lg font-bold text-white">Your accessibility</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                Passenger
              </p>
              <p className="text-xl font-bold text-white">{passengerName || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
                Assistance
              </p>
              <div className="flex items-center gap-3">
                <Heart size={20} className="text-pink-300" aria-hidden="true" />
                <p className="text-xl font-bold text-white">
                  {ASSISTANCE_LABEL[passengerAssistance] || "None"}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="
              w-full min-h-[72px] rounded-2xl
              flex items-center justify-center gap-3
              font-bold text-white text-lg
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
              active:scale-[0.98] transition-all
            "
            style={{
              background: "linear-gradient(135deg,#4F46E5,#6366f1)",
              boxShadow: "0 10px 30px rgba(79,70,229,0.4)",
            }}
          >
            <Check size={24} strokeWidth={3} aria-hidden="true" />
            <span>Looks good — continue</span>
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="
              w-full min-h-[60px] rounded-2xl
              flex items-center justify-center gap-3
              font-semibold text-white text-base
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              active:scale-[0.98] transition-all
            "
          >
            <Pencil size={20} aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
