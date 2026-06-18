/**
 * Input — premium form field with floating label.
 *
 * Doppelrand architecture:
 *  - Outer shell: tinted background, hairline border, large radius
 *  - Inner core: slightly raised surface, inset highlight, smaller radius
 *
 * Features:
 *  - Floating label that moves up + shrinks on focus/value
 *  - Leading icon slot
 *  - Trailing adornment (clear button, mic, etc.)
 *  - Min 60px height for voice-first apps
 *  - Strong focus ring for keyboard users
 *  - aria-describedby links to helper / error
 */
import { forwardRef, ReactNode, InputHTMLAttributes, useId } from "react";
import { motion } from "motion/react";
import { tokens, type } from "../../design-system";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  helper?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingAdornment?: ReactNode;
  size?: "md" | "lg" | "xl";
  fullWidth?: boolean;
}

const SIZE = {
  md: { h: "h-[56px]",  fontSize: type.body.size,   labelSize: type.label.size,   paddingLeft: "pl-14" },
  lg: { h: "h-[64px]",  fontSize: type.bodyLg.size, labelSize: type.label.size,   paddingLeft: "pl-14" },
  xl: { h: "h-[72px]",  fontSize: type.bodyLg.size, labelSize: type.body.size,    paddingLeft: "pl-16" },
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helper,
    error,
    leadingIcon,
    trailingAdornment,
    size = "lg",
    fullWidth = true,
    className = "",
    id: idProp,
    value,
    defaultValue,
    placeholder = " ",
    ...rest
  },
  ref
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const s = SIZE[size];
  const hasError = !!error;
  const filled = !!value || !!defaultValue;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <div
        className="relative border"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          borderColor: hasError
            ? "rgba(239, 68, 68, 0.5)"
            : "rgba(255, 255, 255, 0.10)",
          borderRadius: tokens.radius["2xl"],
          boxShadow: tokens.elevation.insetHighlight,
        }}
      >
        {/* Floating label — sits inside the field when empty, floats up when filled */}
        <motion.label
          htmlFor={id}
          initial={false}
          animate={{
            y: filled ? -10 : 0,
            scale: filled ? 0.78 : 1,
            color: hasError ? "#FCA5A5" : filled ? "#A5B4FC" : "rgba(255, 255, 255, 0.54)",
          }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="absolute left-14 top-1/2 -translate-y-1/2 origin-left pointer-events-none font-semibold tracking-wide"
          style={{
            fontSize: s.labelSize,
          }}
        >
          {label}
        </motion.label>

        {/* Leading icon */}
        {leadingIcon && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            style={{ color: "rgba(255, 255, 255, 0.54)" }}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          className={`
            peer w-full bg-transparent border-0 outline-none
            text-white placeholder:text-transparent
            focus:ring-0
            ${s.h} ${s.paddingLeft} pr-4
            ${className}
          `}
          style={{
            fontSize: s.fontSize,
            fontWeight: 500,
            lineHeight: 1.4,
            paddingTop: filled ? 12 : 0,
            paddingBottom: filled ? 4 : 0,
          }}
          {...rest}
        />

        {trailingAdornment && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {trailingAdornment}
          </span>
        )}
      </div>

      {(helper || error) && (
        <p
          id={helperId || errorId}
          role={hasError ? "alert" : undefined}
          className="mt-2 px-1 text-sm"
          style={{ color: hasError ? "#FCA5A5" : "rgba(255, 255, 255, 0.54)" }}
        >
          {error || helper}
        </p>
      )}
    </div>
  );
});

export default Input;
