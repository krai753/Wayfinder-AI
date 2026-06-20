/**
 * VoiceMicButton — The centerpiece of Wayfinder's voice-first UX.
 *
 * - 100-140px on mobile, scales up on larger screens
 * - High contrast (indigo→green gradient with white icon)
 * - Pulsing animation while listening
 * - 3-layer ripple effect during recording
 * - Floating shadow for depth
 * - Strong 4px focus ring for keyboard / VoiceOver users
 * - State machine: idle → listening → processing → speaking → idle
 * - Reduced motion respected
 * - 100% ARIA labelled — screen readers announce state changes
 */
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Mic, MicOff, Loader2, Volume2, Check } from "lucide-react";
import { useEffect } from "react";

export type MicState = "idle" | "listening" | "processing" | "speaking" | "success" | "error";

interface VoiceMicButtonProps {
  state: MicState;
  onClick?: () => void;
  onLongPress?: () => void;
  size?: "md" | "lg" | "xl" | "2xl";
  disabled?: boolean;
  /** aria-label override. Otherwise derived from state. */
  ariaLabel?: string;
  /** When true, the button will auto-focus on mount. */
  autoFocus?: boolean;
}

const STATE_LABEL: Record<MicState, string> = {
  idle: "Tap to speak",
  listening: "Listening. Tap to stop.",
  processing: "Processing your request",
  speaking: "AI is speaking",
  success: "Done",
  error: "Error. Tap to try again.",
};

const STATE_DESCRIPTION: Record<MicState, string> = {
  idle: "Hold to speak, or tap to start voice input",
  listening: "Speak now. Your words will appear on screen and be sent to the assistant.",
  processing: "The assistant is thinking about your request",
  speaking: "The assistant is reading the response aloud",
  success: "Action completed",
  error: "Something went wrong. Please try again.",
};

export function VoiceMicButton({
  state,
  onClick,
  disabled = false,
  ariaLabel,
  autoFocus = false,
  size = "lg",
}: VoiceMicButtonProps) {
  const reduced = useReducedMotion();

  // Size: 100-140px on mobile per spec
  const dims: Record<string, { btn: string; icon: number }> = {
    md: { btn: "w-[100px] h-[100px]", icon: 36 },
    lg: { btn: "w-[120px] h-[120px]", icon: 44 },
    xl: { btn: "w-[140px] h-[140px]", icon: 52 },
    "2xl": { btn: "w-[176px] h-[176px]", icon: 64 },
  };
  const d = dims[size];

  const isActive = state === "listening";
  const isProcessing = state === "processing";
  const isSpeaking = state === "speaking";
  const isSuccess = state === "success";
  const isError = state === "error";

  // Color theming per state
  const gradient = (() => {
    if (isError) return "linear-gradient(135deg,#DC2626,#EF4444)";
    if (isSuccess) return "linear-gradient(135deg,#16A34A,#22C55E)";
    if (isSpeaking) return "linear-gradient(135deg,#22C55E,#4ADE80)";
    if (isProcessing) return "linear-gradient(135deg,#6366f1,#818CF8)";
    if (isActive) return "linear-gradient(135deg,#EF4444,#F87171)";
    return "linear-gradient(135deg,#4F46E5,#6366f1)";
  })();

  const glowColor = (() => {
    if (isError) return "rgba(239,68,68,0.55)";
    if (isSuccess) return "rgba(34,197,94,0.55)";
    if (isSpeaking) return "rgba(34,197,94,0.55)";
    if (isProcessing) return "rgba(99,102,241,0.55)";
    if (isActive) return "rgba(239,68,68,0.55)";
    return "rgba(79,70,229,0.45)";
  })();

  // Pick icon
  const IconComponent = isActive
    ? MicOff
    : isProcessing
      ? Loader2
      : isSpeaking
        ? Volume2
        : isSuccess
          ? Check
          : Mic;

  // Announce state changes for screen readers via a hidden live region
  useEffect(() => {
    if (state === "listening" || state === "speaking") {
      // The aria-live region below will pick this up
    }
  }, [state]);

  return (
    <div className="relative inline-flex flex-col items-center" role="group" aria-label="Voice control">
      {/* Screen-reader-only live region for state announcements */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {STATE_DESCRIPTION[state]}
      </span>

      <div className="relative inline-flex items-center justify-center">
        {/* Layer 1: Outermost breathing ring (only when listening) */}
        <AnimatePresence>
          {isActive && !reduced && (
            <motion.div
              key="outer-ripple"
              className="absolute rounded-full pointer-events-none"
              style={{
                width: d.btn,
                height: d.btn,
                border: "2px solid rgba(239,68,68,0.4)",
              }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Layer 2: Middle breathing ring (only when listening) */}
        <AnimatePresence>
          {isActive && !reduced && (
            <motion.div
              key="mid-ripple"
              className="absolute rounded-full pointer-events-none"
              style={{
                width: d.btn,
                height: d.btn,
                border: "2px solid rgba(239,68,68,0.5)",
              }}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          )}
        </AnimatePresence>

        {/* Layer 3: Soft glow halo (always present, intensity varies) */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: d.btn,
            height: d.btn,
            background: glowColor,
            filter: "blur(20px)",
          }}
          animate={
            reduced
              ? { opacity: isActive ? 0.5 : 0.3 }
              : isActive
                ? { scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }
                : { scale: 1, opacity: 0.4 }
          }
          transition={
            reduced
              ? { duration: 0.3 }
              : isActive
                ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
          }
        />

        {/* Layer 4: The actual button */}
        <motion.button
          type="button"
          onClick={onClick}
          disabled={disabled || isProcessing}
          autoFocus={autoFocus}
          aria-label={ariaLabel ?? STATE_LABEL[state]}
          aria-pressed={isActive}
          aria-busy={isProcessing}
          aria-describedby="voice-mic-description"
          className={`
            relative ${d.btn} rounded-full flex items-center justify-center
            focus:outline-none focus:ring-4 focus:ring-white/80 focus:ring-offset-4 focus:ring-offset-[#0B1020]
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
          style={{
            background: gradient,
            border: "3px solid rgba(255,255,255,0.18)",
            boxShadow: `0 12px 40px ${glowColor}, inset 0 2px 4px rgba(255,255,255,0.18)`,
          }}
          whileTap={!disabled && !isProcessing ? { scale: 0.93 } : undefined}
          animate={
            reduced
              ? {}
              : isActive
                ? { scale: [1, 1.04, 1] }
                : isProcessing
                  ? { rotate: [0, 4, -4, 0] }
                  : {}
          }
          transition={
            reduced
              ? {}
              : isActive
                ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                : isProcessing
                  ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
          }
        >
          {isProcessing ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="inline-flex"
            >
              <IconComponent size={d.icon} color="#fff" strokeWidth={2.5} />
            </motion.span>
          ) : (
            <IconComponent
              size={d.icon}
              color="#fff"
              strokeWidth={2.5}
              fill={isActive ? "rgba(255,255,255,0.15)" : "none"}
            />
          )}
        </motion.button>
      </div>

      {/* Hidden description for screen readers */}
      <span id="voice-mic-description" className="sr-only">
        {STATE_DESCRIPTION[state]}
      </span>

      {/* Visual state label below the button (also a11y-hidden — state is in the live region) */}
      <p
        aria-hidden="true"
        className={`
          mt-6 text-base sm:text-lg font-semibold text-center
          ${isError ? "text-red-300" : isSuccess ? "text-emerald-300" : "text-white"}
        `}
      >
        {STATE_LABEL[state]}
      </p>
    </div>
  );
}
