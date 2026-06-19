/**
 * useLocation — minimal location hook for the in-app router.
 *
 * We don't use a real router (the app is a small SPA with
 * a single state-driven screen). This hook reads the current
 * screen from a global window flag set by App.tsx on every
 * navigation, so non-React consumers (like the help button)
 * can know where they are.
 *
 * For React components, prefer `useWizard()` or the `navigate`
 * prop. This hook is only for cross-cutting UI like the help
 * button.
 */
import { useEffect, useState } from "react";
import { Screen } from "../types";

export function useLocation(): Screen {
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window === "undefined") return "splash" as Screen;
    return ((window as any).__WAYFINDER_SCREEN__ ?? "splash") as Screen;
  });

  useEffect(() => {
    function onChange() {
      const next = (window as any).__WAYFINDER_SCREEN__ as Screen;
      if (next && next !== screen) setScreen(next);
    }
    window.addEventListener("wayfinder:screen-change", onChange);
    return () => window.removeEventListener("wayfinder:screen-change", onChange);
  }, [screen]);

  return screen;
}
