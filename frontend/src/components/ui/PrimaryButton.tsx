/**
 * Accessible Primary Button
 * - Min 60px height for voice-first apps
 * - Strong focus ring for keyboard users
 * - Disabled state with reduced opacity
 * - Loading spinner support
 */
import { ReactNode, ButtonHTMLAttributes } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg" | "xl";
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  disabled = false,
  icon,
  loading = false,
  variant = "primary",
  size = "lg",
  ...rest
}: PrimaryButtonProps) {
  const sizes: Record<string, string> = {
    md: "px-5 py-3 text-sm min-h-[52px] rounded-xl",
    lg: "px-6 py-4 text-base min-h-[60px] rounded-2xl",
    xl: "px-8 py-5 text-lg min-h-[72px] rounded-2xl",
  };

  const variants: Record<string, { bg: string; bgDisabled: string; text: string }> = {
    primary: {
      bg: "linear-gradient(135deg,#4F46E5,#6366f1)",
      bgDisabled: "#2D3B55",
      text: "text-white",
    },
    secondary: {
      bg: "rgba(79,70,229,0.18)",
      bgDisabled: "rgba(45,59,85,0.4)",
      text: "text-white",
    },
    danger: {
      bg: "linear-gradient(135deg,#DC2626,#EF4444)",
      bgDisabled: "#5C2A2A",
      text: "text-white",
    },
    ghost: {
      bg: "transparent",
      bgDisabled: "transparent",
      text: "text-white",
    },
  };

  const v = variants[variant];
  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex items-center justify-center gap-3 font-semibold
        transition-all duration-200
        active:scale-[0.97]
        focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size]}
        ${v.text}
        ${className}
      `}
      style={{
        background: isDisabled ? v.bgDisabled : v.bg,
        boxShadow: isDisabled
          ? "none"
          : variant === "primary"
            ? "0 8px 24px rgba(79,70,229,0.35)"
            : variant === "danger"
              ? "0 8px 24px rgba(220,38,38,0.35)"
              : "none",
      }}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
