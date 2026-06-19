/**
 * BottomNav — fixed bottom tab bar.
 * Always-visible voice button is highlighted; quick access to home/trips/AI/profile.
 */
import { motion } from "motion/react";
import { Home, Bookmark, MessageSquare, User } from "lucide-react";
import { Screen } from "../../types";

interface BottomNavProps {
  current: Screen;
  navigate: (s: Screen) => void;
}

const HIDDEN_ON: Screen[] = [
  "splash",
  "onboard1",
  "onboard2",
  "onboard3",
  "voice",
  "origin",
  "destination",
  "dates",
  "loading",
  "flightDetail",
  "passenger",
  "accessibility",
  "review",
  "payment",
  "success",
];

const TABS: { screen: Screen; icon: typeof Home; label: string }[] = [
  { screen: "home", icon: Home, label: "Home" },
  { screen: "bookings", icon: Bookmark, label: "Trips" },
  { screen: "assistant", icon: MessageSquare, label: "AI" },
  { screen: "profile", icon: User, label: "Profile" },
];

export function BottomNav({ current, navigate }: BottomNavProps) {
  if (HIDDEN_ON.includes(current)) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 px-4 pb-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center justify-around rounded-2xl border border-white/10 px-2 py-2"
        style={{
          background: "rgba(15,22,41,0.92)",
          backdropFilter: "blur(20px)",
        }}
        role="navigation"
        aria-label="Main"
      >
        {TABS.map((t) => {
          const isActive = current === t.screen;
          const Icon = t.icon;
          return (
            <button
              key={t.screen}
              type="button"
              onClick={() => navigate(t.screen)}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
              className="
                flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                transition-colors min-h-[60px] min-w-[60px]
              "
              style={{ color: isActive ? "#A5B4FC" : "#64748B" }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-1 w-8 h-1 rounded-full bg-indigo-400"
                  aria-hidden="true"
                />
              )}
              <Icon size={22} aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
