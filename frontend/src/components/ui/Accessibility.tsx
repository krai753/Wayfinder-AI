/**
 * Accessibility — global utilities + global skip link.
 *
 * Two key components for blind / keyboard users:
 *
 * 1. <SkipToContent /> — visually hidden until focused, then
 *    appears at the top of the page. Lets keyboard / screen-reader
 *    users jump past the navigation chrome straight to the main
 *    content. WCAG 2.4.1 (Bypass Blocks, Level A).
 *
 * 2. <VisuallyHidden /> — sr-only equivalent. Hides content
 *    visually but keeps it available to screen readers.
 *
 * 3. useAutoRead — hook that auto-speaks a message on mount, with
 *    cancellation on unmount. Centralized so every screen can use
 *    it without re-implementing.
 */
import { ReactNode, useEffect, useRef } from "react";
import { speak, stopSpeaking } from "../../hooks/useSpeech";

interface SkipToContentProps {
  targetId?: string;
  label?: string;
}

export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipToContentProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      (el as HTMLElement).tabIndex = -1;
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2
        focus:z-[100]
        focus:px-6 focus:py-3
        focus:rounded-full
        focus:bg-indigo-500 focus:text-white
        focus:font-semibold
        focus:shadow-2xl focus:shadow-indigo-500/50
        focus:outline-none
        focus:ring-4 focus:ring-white/30
        transition-transform
      "
    >
      {label}
    </a>
  );
}

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: "span" | "div" | "p";
}

export function VisuallyHidden({ children, as: As = "span" }: VisuallyHiddenProps) {
  return (
    <As
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {children}
    </As>
  );
}

/**
 * Hook: auto-speak a message on mount, with cleanup on unmount.
 *
 * Use on every screen so blind users hear what just appeared
 * without having to tap anything.
 */
export function useAutoRead(
  text: string,
  options: { enabled?: boolean; deps?: ReadonlyArray<unknown> } = {}
) {
  const { enabled = true, deps = [] } = options;
  const spokenRef = useRef(false);

  useEffect(() => {
    if (!enabled || !text || spokenRef.current) return;
    spokenRef.current = true;
    speak({ text });
    return () => {
      stopSpeaking();
      spokenRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, text, ...deps]);
}
