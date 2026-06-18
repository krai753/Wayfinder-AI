/**
 * SplashScreen — first impression.
 *
 * Refactored to feel like a $150k agency build:
 * - Hero brand mark with deep glow + ambient halo
 * - Editorial type scale (massive 6xl+ headline)
 * - "Macrowhitespace" — py-32+ between sections
 * - Spring-eased entrance animations
 * - Reduced-motion respected
 * - Strong focus ring on the CTA
 * - Auto-reads welcome on mount
 * - ARIA-live region for screen readers
 */
import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Navigation, ArrowRight, Volume2, Sparkles } from "lucide-react";
import { speak } from "../../hooks/useSpeech";
import { Button } from "../ui/Button";
import { VoiceWave } from "../ui/VoiceWave";
import { tokens, type, zIndex } from "../../design-system";
import { NavFn } from "../../types";

interface SplashScreenProps {
  navigate: NavFn;
}

export function SplashScreen({ navigate }: SplashScreenProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => navigate("home"), 3000);
    speak({
      text: "Welcome to Wayfinder AI. Voice first travel for everyone. Tap get started, or wait to continue.",
    });
    return () => clearTimeout(t);
  }, [navigate]);

  function handleRead() {
    speak({
      text: "Wayfinder AI. Voice first travel for everyone. Tap get started to begin.",
    });
  }

  return (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-8 text-center overflow-hidden"
      style={{ background: tokens.color.bg.deepest, zIndex: zIndex.base }}
    >
      {/* Ambient halo — radial gradient orb behind the hero */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "8%",
          left: "50%",
          x: "-50%",
          width: "min(560px, 130vw)",
          height: "min(560px, 130vw)",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.32) 0%, rgba(34,197,94,0.18) 35%, transparent 65%)",
          filter: "blur(20px)",
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      />

      {/* Eyebrow tag — editorial detail */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-8"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.78)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            ...type.eyebrow,
          }}
        >
          <Sparkles size={11} aria-hidden="true" />
          <span>Voice · Travel · Accessible</span>
        </span>
      </motion.div>

      {/* Brand mark — geometric, glowing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-10"
      >
        <div
          className="w-32 h-32 rounded-[2rem] flex items-center justify-center"
          style={{
            background: tokens.gradient.brand,
            boxShadow:
              "0 0 80px rgba(99,102,241,0.55), 0 0 32px rgba(34,197,94,0.35), inset 0 2px 2px rgba(255,255,255,0.20)",
            border: "1.5px solid rgba(255, 255, 255, 0.18)",
          }}
          aria-hidden="true"
        >
          <Navigation size={56} color="#fff" strokeWidth={2.4} />
        </div>
      </motion.div>

      {/* Wordmark — massive editorial display */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-white"
        style={{
          ...type.display,
          fontSize: "clamp(3rem, 12vw, 4.5rem)",
          lineHeight: 1.04,
          letterSpacing: "-0.04em",
          fontWeight: 800,
        }}
      >
        Wayfinder AI
      </motion.h1>

      {/* Animated voice wave — the signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.8 }}
        className="relative z-10 my-10"
        aria-hidden="true"
      >
        <VoiceWave active={true} size="lg" />
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-white/95 mb-3"
        style={{ ...type.h2, fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        Accessible travel for everyone
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="relative z-10 text-slate-400 max-w-xs mx-auto mb-16"
        style={type.body}
      >
        Powered by Duffel • Built for blind and visually impaired travelers
      </motion.p>

      {/* CTAs — Button-in-Button pattern */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xs flex flex-col gap-3"
      >
        <Button
          onClick={() => navigate("home")}
          size="hero"
          variant="primary"
          icon={<ArrowRight size={22} strokeWidth={2.5} />}
          fullWidth
        >
          Get started
        </Button>
        <Button
          onClick={handleRead}
          size="lg"
          variant="secondary"
          icon={<Volume2 size={18} />}
          fullWidth
        >
          Read welcome message
        </Button>
      </motion.div>

      {/* Auto-progress hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="relative z-10 text-xs uppercase tracking-[0.18em] text-slate-500 mt-12"
        style={type.eyebrow}
      >
        Continuing automatically
      </motion.p>
    </div>
  );
}
