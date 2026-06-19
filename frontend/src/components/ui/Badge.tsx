/**
 * Status badge — high contrast for accessibility
 */
import { ReactNode } from "react";

type BadgeColor = "indigo" | "green" | "amber" | "red" | "blue" | "slate";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  icon?: ReactNode;
}

export function Badge({ children, color = "indigo", icon }: BadgeProps) {
  const styles: Record<BadgeColor, string> = {
    indigo: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
    green: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    amber: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    red: "bg-red-500/15 text-red-200 border-red-400/30",
    blue: "bg-cyan-500/15 text-cyan-200 border-cyan-400/30",
    slate: "bg-slate-500/15 text-slate-200 border-slate-400/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[color]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
