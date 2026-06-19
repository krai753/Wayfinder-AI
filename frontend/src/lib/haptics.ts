/**
 * Haptic feedback — Vibration API wrapper.
 *
 * Tiny tactile confirmation for blind / low-vision users. Combined
 * with audio cues, haptics provide a third sensory channel for
 * critical events:
 *   - Voice recording started/stopped
 *   - Selection confirmed
 *   - Error occurred
 *   - Action completed
 *
 * Browser support: most modern Android browsers, no iOS Safari
 * support (Apple intentionally disables the Vibration API on iOS).
 * We no-op silently when unsupported.
 *
 * Usage:
 *   import { haptic } from "../../lib/haptics";
 *   haptic.tap();          // short tap (10ms)
 *   haptic.success();      // success pattern (10-50-10)
 *   haptic.warning();      // warning pattern (50-30-50-30-50)
 */

const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

function vibrate(pattern: number | number[]) {
  if (!isSupported) return;
  try {
    (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(pattern);
  } catch {
    // Silently ignore — never crash the app on haptic failure
  }
}

export const haptic = {
  /** Quick tap (10ms). Use for individual button presses. */
  tap: () => vibrate(10),

  /** Selection confirmed (double-tap, 30-10-30). */
  select: () => vibrate([30, 10, 30]),

  /** Success pattern. Use when a major action completes. */
  success: () => vibrate([10, 50, 10]),

  /** Warning. Use before destructive actions or on errors. */
  warning: () => vibrate([50, 30, 50, 30, 50]),

  /** Heavy thump. Use for the most critical state changes. */
  heavy: () => vibrate(50),

  /** Cancel pattern. Use when the user cancels an action. */
  cancel: () => vibrate([10, 30, 10]),

  /** Stop any ongoing vibration. */
  stop: () => {
    if (!isSupported) return;
    try {
      (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(0);
    } catch {}
  },

  /** Whether the device supports haptics. */
  isSupported,
};

/**
 * React hook: returns a stable haptic function for the given pattern.
 * Useful when you want to keep the same callback identity across renders.
 */
export function useHaptic() {
  return haptic;
}
