/**
 * ScreenHeader — consistent top bar with back button, title, and right slot
 * - Back button is min 60px touch target
 * - Title is large (20px+) for low vision
 * - Right slot can hold voice button, settings, etc.
 */
import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: ReactNode;
  largeTitle?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Go back",
  rightSlot,
  largeTitle = false,
}: ScreenHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 w-full px-4 pt-4 pb-3"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        background:
          "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.75) 80%, transparent 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="
              shrink-0 w-[60px] h-[60px] rounded-full
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 active:bg-white/16
              border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
              transition-colors
            "
          >
            <ChevronLeft size={28} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1
            className={`
              font-extrabold text-white leading-tight
              ${largeTitle ? "text-2xl" : "text-xl"}
            `}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </header>
  );
}
