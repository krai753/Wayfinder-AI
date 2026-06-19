/**
 * Back / Forward pair navigation buttons for voice-first UX.
 * The user should never be lost — back/forward are always visible.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavPairProps {
  onBack?: () => void;
  onForward?: () => void;
  backLabel?: string;
  forwardLabel?: string;
  forwardDisabled?: boolean;
  forwardText?: string;
}

export function NavPair({
  onBack,
  onForward,
  backLabel = "Back",
  forwardLabel = "Continue",
  forwardDisabled = false,
  forwardText,
}: NavPairProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="
            w-[60px] h-[60px] rounded-full shrink-0
            flex items-center justify-center
            bg-white/8 hover:bg-white/12 active:bg-white/16
            border border-white/10
            focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            transition-colors
          "
        >
          <ChevronLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
      {onForward && (
        <button
          type="button"
          onClick={onForward}
          disabled={forwardDisabled}
          aria-label={forwardLabel}
          className="
            flex-1 min-h-[60px] px-6 rounded-2xl
            flex items-center justify-center gap-2
            font-semibold text-white text-base
            focus:outline-none focus:ring-4 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all active:scale-[0.98]
          "
          style={{
            background: forwardDisabled
              ? "#2D3B55"
              : "linear-gradient(135deg,#4F46E5,#6366f1)",
            boxShadow: forwardDisabled
              ? "none"
              : "0 8px 24px rgba(79,70,229,0.4)",
          }}
        >
          <span>{forwardText ?? forwardLabel}</span>
          <ChevronRight size={22} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
