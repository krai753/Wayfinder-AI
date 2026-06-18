/**
 * Animated voice waveform
 * - Pure CSS animation
 * - Respects prefers-reduced-motion via class
 * - ARIA-hidden so screen readers don't see it
 */
import { motion, useReducedMotion } from "motion/react";

interface VoiceWaveProps {
  active: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "auto" | "indigo" | "green" | "white";
}

export function VoiceWave({ active, size = "md", color = "auto" }: VoiceWaveProps) {
  const reduced = useReducedMotion();
  const bars = size === "xl" ? 11 : size === "lg" ? 9 : size === "md" ? 7 : 5;
  const heights = [30, 50, 70, 90, 100, 90, 70, 50, 30, 60, 40];
  const width = size === "xl" ? 6 : size === "lg" ? 5 : size === "md" ? 4 : 3;
  const gap = size === "xl" ? 2 : 1.5;

  const bg = (() => {
    if (!active) return "rgba(255,255,255,0.18)";
    if (color === "indigo") return "linear-gradient(180deg,#6366f1,#4F46E5)";
    if (color === "green") return "linear-gradient(180deg,#22C55E,#16A34A)";
    if (color === "white") return "rgba(255,255,255,0.9)";
    return "linear-gradient(180deg,#22C55E,#4F46E5)";
  })();

  if (reduced) {
    return (
      <div
        className="flex items-center"
        style={{ gap: `${gap}px` }}
        aria-hidden="true"
      >
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width,
              height: active ? heights[i % heights.length] * 0.7 : 8,
              background: bg,
              transition: "height 200ms ease",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center"
      style={{ gap: `${gap}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width, background: bg }}
          animate={
            active
              ? {
                  height: [
                    heights[i % heights.length] * 0.3,
                    heights[i % heights.length],
                    heights[i % heights.length] * 0.5,
                    heights[i % heights.length] * 0.8,
                    heights[i % heights.length] * 0.3,
                  ],
                }
              : { height: 8 }
          }
          transition={
            active
              ? {
                  duration: 0.8 + i * 0.08,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.06,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
