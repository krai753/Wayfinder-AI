/**
 * Card — premium glass surface using the Doppelrand pattern.
 *
 * Outer shell has a subtle background tint + hairline border + outer
 * radius. Inner core has its own background + inner highlight
 * (inset shadow) + mathematically smaller radius for concentric curves.
 *
 * Variants:
 *   - default : neutral glass
 *   - tinted  : slight indigo tint (used for highlights)
 *   - success : green-tinted glass
 *   - danger  : red-tinted glass
 *
 * Sizes:
 *   - sm : p-4
 *   - md : p-5
 *   - lg : p-6
 *   - xl : p-8
 */
import { forwardRef, ReactNode, KeyboardEvent, HTMLAttributes } from "react";
import { motion, useReducedMotion } from "motion/react";
import { tokens } from "../../design-system";

type Variant = "default" | "tinted" | "success" | "danger" | "raised";
type Padding = "sm" | "md" | "lg" | "xl" | "none";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  children: ReactNode;
  variant?: Variant;
  padding?: Padding;
  /** Make it a tappable button (with keyboard + screen-reader support). */
  onClick?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  selected?: boolean;
  /** Disable press feedback even if onClick is provided. */
  staticPress?: boolean;
}

const PADDING: Record<Padding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

const VARIANT_OUTER: Record<Variant, string> = {
  default: "bg-white/[0.04] border-white/[0.08]",
  tinted:  "bg-indigo-500/[0.08] border-indigo-400/[0.16]",
  success: "bg-emerald-500/[0.08] border-emerald-400/[0.18]",
  danger:  "bg-red-500/[0.08] border-red-400/[0.18]",
  raised:  "bg-white/[0.06] border-white/[0.10]",
};

const VARIANT_INNER: Record<Variant, string> = {
  default: tokens.gradient.glassShine,
  tinted:  "linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.02) 50%, transparent 100%)",
  success: "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.02) 50%, transparent 100%)",
  danger:  "linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.02) 50%, transparent 100%)",
  raised:  "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
};

const VARIANT_INNER_BG: Record<Variant, string> = {
  default: tokens.color.glass.fill,
  tinted:  "rgba(28, 36, 70, 0.78)",
  success: "rgba(20, 50, 35, 0.78)",
  danger:  "rgba(60, 28, 28, 0.78)",
  raised:  "rgba(28, 36, 60, 0.85)",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    variant = "default",
    padding = "md",
    onClick,
    ariaLabel,
    ariaLabelledBy,
    selected,
    staticPress = false,
    className = "",
    ...rest
  },
  ref
) {
  const reduced = useReducedMotion();
  const interactive = !!onClick;

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  // Outer radius for the shell
  const outerRadius = tokens.radius["2xl"];
  const innerRadius = `calc(${outerRadius} - 0.375rem)`;

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      onKeyDown={handleKey}
      role={interactive ? "button" : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-pressed={selected !== undefined ? selected : undefined}
      whileTap={
        interactive && !reduced && !staticPress
          ? { scale: 0.985 }
          : undefined
      }
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`
        relative border
        ${VARIANT_OUTER[variant]}
        ${interactive ? "cursor-pointer" : ""}
        ${selected ? "ring-2 ring-indigo-400/50 border-indigo-400/50" : ""}
        focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/70
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020]
        transition-shadow duration-200
        ${className}
      `}
      style={{
        borderRadius: outerRadius,
        boxShadow: selected
          ? "0 0 0 1px rgba(129,140,248,0.4), 0 12px 36px rgba(99,102,241,0.25)"
          : interactive
            ? "0 1px 1px rgba(0,0,0,0.32)"
            : "none",
      }}
      {...(rest as any)}
    >
      {/* Inner core — the actual content surface, with the
          Doppelrand inset highlight + smaller radius for concentric
          curves */}
      <div
        className={`relative ${PADDING[padding]}`}
        style={{
          background: VARIANT_INNER_BG[variant],
          borderRadius: innerRadius,
          boxShadow: tokens.elevation.insetHighlight,
          backgroundImage: VARIANT_INNER[variant],
        }}
      >
        {children}
      </div>
    </motion.div>
  );
});

export default Card;
