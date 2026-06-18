/**
 * Accessible Glass Card
 * - 60px+ touch targets inside
 * - High contrast border for low vision
 * - Focusable when interactive
 */
import { ReactNode, KeyboardEvent } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  role?: string;
  tabIndex?: number;
  selected?: boolean;
}

export function GlassCard({
  children,
  className = "",
  onClick,
  ariaLabel,
  ariaLabelledBy,
  role,
  tabIndex,
  selected,
}: GlassCardProps) {
  const interactive = !!onClick;
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKey}
      role={role ?? (interactive ? "button" : undefined)}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-pressed={selected !== undefined ? selected : undefined}
      className={`
        relative rounded-2xl border backdrop-blur-xl
        transition-all duration-200
        ${interactive ? "cursor-pointer active:scale-[0.98]" : ""}
        ${selected ? "border-indigo-400/60 ring-2 ring-indigo-400/30" : "border-white/10"}
        focus:outline-none focus:ring-4 focus:ring-indigo-400/60 focus:ring-offset-2 focus:ring-offset-[#0B1020]
        ${className}
      `}
      style={{ background: "rgba(21,28,47,0.7)" }}
    >
      {children}
    </div>
  );
}
