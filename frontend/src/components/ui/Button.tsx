/**
 * Button — premium, fully-tokenized.
 *
 * Implements the "Button-in-Button" pattern from the high-end design
 * skill: a primary pill, with the trailing icon nested inside its
 * own circular wrapper that animates on hover/press.
 *
 * Variants:
 *   - primary   : gradient + glow, used for the main CTA
 *   - secondary : subtle glass, used for secondary actions
 *   - ghost     : borderless, used in tight rows
 *   - danger    : red gradient, used for destructive actions
 *   - success   : green gradient, used for confirmations
 *
 * Sizes (heights):
 *   - sm  : 44px — minimum touch target
 *   - md  : 52px
 *   - lg  : 60px — preferred
 *   - xl  : 72px — hero CTAs
 *   - hero: 80px — confirm-and-pay
 */
import { forwardRef, ReactNode, ButtonHTMLAttributes } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import { tokens, type } from "../../design-system";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "xl" | "hero";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Trailing icon — rendered inside its own circular wrapper. */
  icon?: ReactNode;
  /** Leading icon — never nested, sits flat in the row. */
  leadingIcon?: ReactNode;
  fullWidth?: boolean;
}

const SIZE: Record<Size, { h: string; px: string; py: string; text: typeof type.body | typeof type.bodyLg; radius: string; iconSize: number }> = {
  sm:    { h: "min-h-[44px] h-[44px]",    px: "px-4", py: "py-2", text: type.label,   radius: tokens.radius.lg,   iconSize: 16 },
  md:    { h: "min-h-[52px] h-[52px]",    px: "px-5", py: "py-2.5", text: type.bodySm, radius: tokens.radius.xl,  iconSize: 18 },
  lg:    { h: "min-h-[60px] h-[60px]",    px: "px-6", py: "py-3.5", text: type.body,  radius: tokens.radius["2xl"], iconSize: 20 },
  xl:    { h: "min-h-[72px] h-[72px]",    px: "px-7", py: "py-4", text: type.bodyLg, radius: tokens.radius["2xl"], iconSize: 22 },
  hero:  { h: "min-h-[80px] h-[80px]",    px: "px-8", py: "py-5", text: type.h3,     radius: tokens.radius["3xl"], iconSize: 26 },
};

const VARIANT_BG: Record<Variant, string> = {
  primary:   tokens.gradient.primary,
  secondary: "rgba(255, 255, 255, 0.06)",
  ghost:     "transparent",
  danger:    tokens.gradient.danger,
  success:   tokens.gradient.success,
};

const VARIANT_BG_DISABLED: Record<Variant, string> = {
  primary:   "rgba(45, 59, 85, 0.5)",
  secondary: "rgba(255, 255, 255, 0.03)",
  ghost:     "transparent",
  danger:    "rgba(92, 42, 42, 0.5)",
  success:   "rgba(20, 83, 45, 0.5)",
};

const VARIANT_BORDER: Record<Variant, string> = {
  primary:   "rgba(255, 255, 255, 0.16)",
  secondary: "rgba(255, 255, 255, 0.10)",
  ghost:     "rgba(255, 255, 255, 0.10)",
  danger:    "rgba(255, 255, 255, 0.16)",
  success:   "rgba(255, 255, 255, 0.16)",
};

const VARIANT_GLOW: Record<Variant, string> = {
  primary:   tokens.elevation.glowPrimary,
  secondary: "none",
  ghost:     "none",
  danger:    tokens.elevation.glowDanger,
  success:   tokens.elevation.glowSuccess,
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary:   "#FFFFFF",
  secondary: tokens.color.fg.primary,
  ghost:     tokens.color.fg.primary,
  danger:    "#FFFFFF",
  success:   "#FFFFFF",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "lg",
    loading = false,
    disabled = false,
    icon,
    leadingIcon,
    fullWidth = false,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const reduced = useReducedMotion();
  const s = SIZE[size];
  const isDisabled = disabled || loading;
  const iconWrapSize = Math.max(28, s.iconSize + 12);

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={isDisabled}
      whileTap={!isDisabled && !reduced ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`
        group relative inline-flex items-center justify-center
        font-semibold select-none
        transition-[transform,box-shadow,background,border-color,opacity] duration-200
        focus:outline-none focus-visible:ring-4
        focus-visible:ring-indigo-300/70
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${s.h} ${s.px} ${s.py}
        ${className}
      `}
      style={{
        background: isDisabled ? VARIANT_BG_DISABLED[variant] : VARIANT_BG[variant],
        color: VARIANT_TEXT[variant],
        border: `1.5px solid ${VARIANT_BORDER[variant]}`,
        borderRadius: s.radius,
        boxShadow: isDisabled ? "none" : VARIANT_GLOW[variant],
        fontSize: s.text.size,
        fontWeight: s.text.weight,
        lineHeight: s.text.line,
        letterSpacing: s.text.tracking,
        backdropFilter: variant === "secondary" ? "blur(12px)" : undefined,
        WebkitBackdropFilter: variant === "secondary" ? "blur(12px)" : undefined,
      }}
      {...rest}
    >
      {/* Loading spinner */}
      {loading && (
        <span
          className="inline-flex items-center justify-center"
          style={{ width: iconWrapSize, height: iconWrapSize, marginRight: 8 }}
          aria-hidden="true"
        >
          <Loader2
            size={s.iconSize}
            className="animate-spin"
            style={{ color: VARIANT_TEXT[variant] }}
          />
        </span>
      )}

      {/* Leading icon (flat, no wrapper) */}
      {!loading && leadingIcon && (
        <span
          className="inline-flex items-center justify-center"
          style={{ width: iconWrapSize, height: iconWrapSize, marginRight: 8 }}
          aria-hidden="true"
        >
          <span
            style={{
              color: VARIANT_TEXT[variant],
              display: "inline-flex",
            }}
          >
            {leadingIcon}
          </span>
        </span>
      )}

      {/* Label */}
      <span className="relative z-10">{children}</span>

      {/* Trailing icon — Button-in-Button: nested circular wrapper that
          animates on hover */}
      {!loading && icon && (
        <span
          className="relative inline-flex items-center justify-center ml-3"
          style={{
            width: iconWrapSize,
            height: iconWrapSize,
            borderRadius: tokens.radius.pill,
            background:
              variant === "primary" || variant === "danger" || variant === "success"
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            transition: "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
          aria-hidden="true"
        >
          <motion.span
            className="inline-flex"
            style={{ color: VARIANT_TEXT[variant] }}
            whileHover={!reduced ? { x: 1, y: -1 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {icon}
          </motion.span>
        </span>
      )}
    </motion.button>
  );
});

export default Button;
