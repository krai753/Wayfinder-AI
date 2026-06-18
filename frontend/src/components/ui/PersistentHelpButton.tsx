/**
 * PersistentHelpButton — a floating "Where am I?" help button
 * that lives on every screen, always accessible.
 *
 * Critical for blind users in distress (e.g. standing in a busy
 * airport). One tap reads:
 *   - The current screen name
 *   - The primary action on this screen
 *   - The voice command they can say
 *   - How to go back / forward
 *
 * Also offers quick voice commands via a small popover:
 *   - "Go home"
 *   - "Read this again"
 *   - "Stop reading"
 *   - "Open my trips"
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  HelpCircle,
  X,
  Home,
  Volume2,
  VolumeX,
  Bookmark,
} from "lucide-react";
import { useLocation } from "../../hooks/useLocation";
import { useScreenHelp } from "../../hooks/useScreenHelp";
import { speak, stopSpeaking } from "../../hooks/useSpeech";
import { haptic } from "../../lib/haptics";
import { tokens, type, zIndex } from "../../design-system";
import { NavFn } from "../../types";

interface PersistentHelpButtonProps {
  navigate: NavFn;
  onBack?: () => void;
  primaryAction?: string;
}

const QUICK_ACTIONS: {
  label: string;
  speak: string;
  action: (n: NavFn) => void;
  icon: typeof Home;
}[] = [
  {
    label: "Go home",
    speak: "Going home",
    action: (n) => n("home"),
    icon: Home,
  },
  {
    label: "My trips",
    speak: "Opening my trips",
    action: (n) => n("bookings"),
    icon: Bookmark,
  },
  {
    label: "Voice assistant",
    speak: "Opening voice assistant",
    action: (n) => n("voice"),
    icon: Volume2,
  },
  {
    label: "Stop reading",
    speak: "Stopping",
    action: () => stopSpeaking(),
    icon: VolumeX,
  },
];

export function PersistentHelpButton({
  navigate,
  onBack,
  primaryAction,
}: PersistentHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const help = useScreenHelp(location);

  function handleHelpTap() {
    haptic.tap();
    setOpen((o) => !o);
    if (!open) {
      const text = help.getFullHelp();
      speak({ text });
    }
  }

  function handleQuickAction(
    action: (n: NavFn) => void,
    speakText: string
  ) {
    haptic.tap();
    setOpen(false);
    speak({ text: speakText });
    action(navigate);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={handleHelpTap}
        aria-label="Open help. Tap to hear what you can do on this screen."
        aria-expanded={open}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="fixed bottom-24 right-4 w-[60px] h-[60px] rounded-full z-40 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-300/70"
        style={{
          background: "rgba(99, 102, 241, 0.85)",
          boxShadow:
            "0 10px 30px rgba(99,102,241,0.45), 0 4px 12px rgba(0,0,0,0.32)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          zIndex: zIndex.raised,
        }}
      >
        {open ? (
          <X
            size={26}
            color="#fff"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        ) : (
          <HelpCircle
            size={26}
            color="#fff"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-40 right-4 left-4 max-w-sm ml-auto z-40"
            style={{ zIndex: zIndex.raised }}
            role="dialog"
            aria-label="Help and quick actions"
          >
            <div
              className="border"
              style={{
                background: tokens.color.glass.fillStrong,
                borderColor: "rgba(255,255,255,0.18)",
                borderRadius: tokens.radius["2xl"],
                boxShadow: tokens.elevation.xl,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div
                className="border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  padding: "16px 20px",
                }}
              >
                <p
                  className="text-indigo-300 mb-1"
                  style={type.eyebrow}
                >
                  Help
                </p>
                <p
                  className="text-white"
                  style={{ ...type.h4, fontWeight: 700, lineHeight: 1.3 }}
                >
                  {help.title}
                </p>
                <p
                  className="text-slate-300 mt-2"
                  style={type.bodySm as any}
                >
                  {help.subtitle}
                </p>
              </div>

              <div
                className="border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  padding: "12px 20px",
                }}
              >
                <p
                  className="text-slate-400 mb-1"
                  style={type.eyebrow}
                >
                  What to do
                </p>
                <p
                  className="text-white"
                  style={type.bodyLg as any}
                >
                  {primaryAction || help.primaryAction}
                </p>
                <p
                  className="text-slate-400 mt-2"
                  style={type.bodySm as any}
                >
                  Or say: "{help.voiceCommand}"
                </p>
              </div>

              <div
                className="border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  padding: "12px 20px",
                }}
              >
                <p
                  className="text-slate-400 mb-2"
                  style={type.eyebrow}
                >
                  Quick actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() =>
                          handleQuickAction(a.action, a.speak)
                        }
                        className="flex items-center gap-2 min-h-[52px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-3 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
                        style={type.bodySm as any}
                      >
                        <Icon
                          size={16}
                          className="text-indigo-300 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-white font-semibold">
                          {a.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {onBack && (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.tap();
                      setOpen(false);
                      onBack();
                    }}
                    className="w-full min-h-[52px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
                    style={type.bodySm as any}
                  >
                    Go back to previous screen
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
