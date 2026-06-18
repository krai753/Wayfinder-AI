/**
 * Wayfinder AI — Design System Tokens
 *
 * Single source of truth for color, typography, spacing, radius,
 * elevation, and motion. Every component and screen MUST consume
 * these tokens instead of hard-coding values.
 *
 * Aesthetic: "Ethereal Glass" — deep OLED backgrounds, restrained
 * glass surfaces, indigo→emerald accent gradients, and an
 * editorial-feeling typographic scale.
 */

// ── Color ───────────────────────────────────────────────────────────

export const color = {
  // Background — layered OLED blacks for depth
  bg: {
    deepest: "#050608",   // Page-level
    deep: "#0B1020",      // Screen-level (current)
    surface: "#0F1428",   // Slightly lifted
    raised: "#151B33",    // Cards
    overlay: "rgba(11, 16, 32, 0.78)", // Sheets / nav
  },

  // Foreground — WCAG AA+ on bg.deep
  fg: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.78)",
    tertiary: "rgba(255, 255, 255, 0.54)",
    muted: "rgba(255, 255, 255, 0.36)",
    inverse: "#0B1020",
  },

  // Borders — never pure white, always tinted
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    default: "rgba(255, 255, 255, 0.10)",
    strong: "rgba(255, 255, 255, 0.18)",
    focus: "rgba(129, 140, 248, 0.55)",
  },

  // Brand — indigo + emerald (used sparingly for primary actions)
  brand: {
    indigo50: "#EEF2FF",
    indigo100: "#E0E7FF",
    indigo300: "#A5B4FC",
    indigo400: "#818CF8",
    indigo500: "#6366F1",
    indigo600: "#4F46E5",
    indigo700: "#4338CA",
    emerald400: "#4ADE80",
    emerald500: "#22C55E",
    emerald600: "#16A34A",
  },

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",

  // Glass surface tokens (used by GlassCard etc.)
  glass: {
    fill: "rgba(21, 28, 47, 0.72)",
    fillStrong: "rgba(28, 36, 60, 0.85)",
    highlight: "inset 0 1px 1px rgba(255,255,255,0.10)",
    hairline: "1px solid rgba(255, 255, 255, 0.08)",
  },
} as const;

// ── Gradient ────────────────────────────────────────────────────────

export const gradient = {
  /** Primary CTA — indigo to violet, with subtle 3D feel */
  primary: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%)",
  /** Success / confirm — emerald to teal */
  success: "linear-gradient(135deg, #16A34A 0%, #22C55E 50%, #10B981 100%)",
  /** Danger / cancel */
  danger: "linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)",
  /** Brand showcase — used in hero areas only */
  brand:
    "linear-gradient(135deg, #4F46E5 0%, #7C3AED 33%, #22C55E 66%, #10B981 100%)",
  /** Subtle radial halo for background ambiance */
  halo: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.18) 0%, rgba(34, 197, 94, 0.10) 40%, transparent 70%)",
  /** Glass overlay (subtle highlight gradient for premium cards) */
  glassShine:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 100%)",
} as const;

// ── Spacing (4-pt grid) ─────────────────────────────────────────────

export const space = {
  px: "1px",
  0: "0",
  0.5: "0.125rem",   // 2
  1: "0.25rem",      // 4
  1.5: "0.375rem",   // 6
  2: "0.5rem",       // 8
  2.5: "0.625rem",   // 10
  3: "0.75rem",      // 12
  3.5: "0.875rem",   // 14
  4: "1rem",         // 16
  5: "1.25rem",      // 20
  6: "1.5rem",       // 24
  7: "1.75rem",      // 28
  8: "2rem",         // 32
  9: "2.25rem",      // 36
  10: "2.5rem",      // 40
  11: "2.75rem",     // 44
  12: "3rem",        // 48
  14: "3.5rem",      // 56
  16: "4rem",        // 64
  20: "5rem",        // 80
  24: "6rem",        // 96
  32: "8rem",        // 128
  40: "10rem",       // 160
} as const;

// ── Radius ──────────────────────────────────────────────────────────

export const radius = {
  none: "0",
  xs: "0.375rem",   // 6
  sm: "0.5rem",      // 8
  md: "0.75rem",     // 12
  lg: "1rem",        // 16
  xl: "1.25rem",     // 20
  "2xl": "1.5rem",   // 24
  "3xl": "2rem",     // 32
  "4xl": "2.5rem",   // 40
  pill: "9999px",
  full: "9999px",
} as const;

// ── Typography ─────────────────────────────────────────────────────

export const font = {
  sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  display: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const;

/**
 * Editorial-feeling type scale — large displays, generous body sizes.
 * For low-vision users, body sits at 17-19px (larger than typical 16px).
 */
export const type = {
  // Display — for hero areas only
  displayLg: { size: "3.75rem",   line: "1.04", weight: "800", tracking: "-0.04em" }, // 60
  display:   { size: "3rem",      line: "1.08", weight: "800", tracking: "-0.035em" }, // 48
  displaySm: { size: "2.25rem",   line: "1.12", weight: "800", tracking: "-0.03em" },  // 36

  // Headline
  h1:        { size: "1.875rem",  line: "1.2",  weight: "800", tracking: "-0.025em" }, // 30
  h2:        { size: "1.5rem",    line: "1.25", weight: "700", tracking: "-0.02em" },  // 24
  h3:        { size: "1.25rem",   line: "1.3",  weight: "700", tracking: "-0.015em" }, // 20
  h4:        { size: "1.125rem",  line: "1.4",  weight: "700", tracking: "-0.01em" },  // 18

  // Body — larger than typical for low-vision users
  bodyLg:    { size: "1.125rem",  line: "1.55", weight: "500", tracking: "0" },       // 18
  body:      { size: "1rem",      line: "1.6",  weight: "500", tracking: "0" },       // 16
  bodySm:    { size: "0.9375rem", line: "1.55", weight: "500", tracking: "0" },       // 15

  // Label
  label:     { size: "0.875rem",  line: "1.4",  weight: "700", tracking: "0" },       // 14
  labelSm:   { size: "0.8125rem", line: "1.4",  weight: "700", tracking: "0" },       // 13

  // Overline / eyebrow — uppercase, wide tracking
  eyebrow:   { size: "0.6875rem", line: "1.4",  weight: "700", tracking: "0.18em", transform: "uppercase" }, // 11
  caption:   { size: "0.75rem",   line: "1.4",  weight: "600", tracking: "0.02em" },  // 12
} as const;

// ── Elevation ──────────────────────────────────────────────────────

export const elevation = {
  /** Resting surface */
  none: "none",
  /** Slightly lifted card */
  sm: "0 1px 2px rgba(0, 0, 0, 0.32), 0 1px 1px rgba(0, 0, 0, 0.18)",
  /** Standard card */
  md: "0 4px 12px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.20)",
  /** Floating card / sheet */
  lg: "0 12px 36px rgba(0, 0, 0, 0.42), 0 2px 8px rgba(0, 0, 0, 0.24)",
  /** Modal / hero */
  xl: "0 24px 60px rgba(0, 0, 0, 0.52), 0 6px 16px rgba(0, 0, 0, 0.28)",
  /** Tinted glow for primary CTAs */
  glowPrimary: "0 12px 36px rgba(99, 102, 241, 0.45), 0 4px 12px rgba(79, 70, 229, 0.32)",
  glowSuccess: "0 12px 36px rgba(34, 197, 94, 0.45), 0 4px 12px rgba(22, 163, 74, 0.32)",
  glowDanger: "0 12px 36px rgba(239, 68, 68, 0.45), 0 4px 12px rgba(220, 38, 38, 0.32)",
  /** Premium inset highlight (used inside glass cards) */
  insetHighlight: "inset 0 1px 1px rgba(255, 255, 255, 0.10), inset 0 -1px 1px rgba(0, 0, 0, 0.18)",
} as const;

// ── Motion ──────────────────────────────────────────────────────────

/** Standard durations — UI feels snappy but not frantic */
export const duration = {
  instant: "100ms",
  fast: "180ms",
  base: "260ms",
  slow: "420ms",
  slower: "600ms",
  slowest: "900ms",
} as const;

/**
 * Custom cubic-beziers — replaces generic ease-in-out
 * with curves that simulate real-world mass and intent.
 */
export const easing = {
  /** Default — accelerates in, decelerates out (most natural) */
  standard: "cubic-bezier(0.32, 0.72, 0, 1)",
  /** Snappy entry — overshoots slightly, settles (premium feel) */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Confident exit — accelerates out */
  exit: "cubic-bezier(0.55, 0, 0.7, 0.2)",
  /** Smooth deceleration — for entries */
  in: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Smooth acceleration — for exits */
  out: "cubic-bezier(0.7, 0, 0.84, 0)",
} as const;

// ── Spring (for Motion library) ─────────────────────────────────────

export const spring = {
  /** Default — natural feel */
  default: { type: "spring" as const, stiffness: 280, damping: 28 },
  /** Gentle */
  gentle: { type: "spring" as const, stiffness: 200, damping: 26 },
  /** Bouncy — for celebrations */
  bouncy: { type: "spring" as const, stiffness: 380, damping: 18 },
  /** Snappy — for quick interactions */
  snappy: { type: "spring" as const, stiffness: 500, damping: 32 },
} as const;

// ── Touch targets ───────────────────────────────────────────────────

/** Minimum touch target sizes — for accessibility */
export const touchTarget = {
  /** Standard minimum (WCAG AAA on small UI) */
  min: "44px",
  /** Preferred for primary actions */
  preferred: "56px",
  /** Used for hero CTAs (confirm, mic) */
  hero: "72px",
  /** Mic button only — the largest, most important element */
  mic: "120px",
  micHero: "140px",
} as const;

// ── Z-Index scale (systemic only) ───────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

// ── Re-export everything ────────────────────────────────────────────

export const tokens = {
  color,
  gradient,
  space,
  radius,
  font,
  type,
  elevation,
  duration,
  easing,
  spring,
  touchTarget,
  zIndex,
} as const;

export default tokens;
