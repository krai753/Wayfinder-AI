/**
 * SplashScreen — first thing the user sees.
 * Auto-advances to home after 2.5s. Big "Get started" button is also there.
 */
import { useEffect } from "react";
import { motion } from "motion/react";
import { Navigation, ArrowRight, Volume2 } from "lucide-react";
import { speak } from "../../hooks/useSpeech";
import { PrimaryButton } from "../ui/PrimaryButton";
import { VoiceWave } from "../ui/VoiceWave";
import { NavFn } from "../../types";

interface SplashScreenProps {
  navigate: NavFn;
}

export function SplashScreen({ navigate }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(() => navigate("home"), 2500);
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
      className="min-h-screen w-full flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "radial-gradient(ellipse at center, #1a1f3e 0%, #0B1020 60%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: "linear-gradient(135deg,#4F46E5,#22C55E)",
            boxShadow: "0 0 80px rgba(79,70,229,0.5)",
          }}
          aria-hidden="true"
        >
          <Navigation size={56} color="#fff" strokeWidth={2.4} />
        </div>
        <h1
          className="text-4xl font-extrabold text-white mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Wayfinder AI
        </h1>
        <p className="text-sm font-medium tracking-widest uppercase text-indigo-300">
          Voice · Travel · Accessible
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="my-12"
      >
        <VoiceWave active={true} size="lg" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-2xl font-bold text-white/95 mb-2"
      >
        Accessible travel for everyone
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-base text-slate-400 max-w-xs mb-12"
      >
        Powered by Duffel • Built for blind and visually impaired travelers
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-xs"
      >
        <PrimaryButton
          onClick={() => navigate("home")}
          size="xl"
          icon={<ArrowRight size={22} />}
          className="w-full mb-3"
        >
          Get started
        </PrimaryButton>
        <button
          type="button"
          onClick={handleRead}
          aria-label="Read welcome message aloud"
          className="
            w-full min-h-[60px] rounded-2xl
            flex items-center justify-center gap-3
            font-semibold text-white text-base
            bg-white/8 hover:bg-white/12 border border-white/10
            focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            active:scale-[0.98] transition-all
          "
        >
          <Volume2 size={20} aria-hidden="true" />
          <span>Read welcome message</span>
        </button>
      </motion.div>
    </div>
  );
}
