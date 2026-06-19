/**
 * OnboardingScreen — 3-slide intro. Combines onboard1/2/3.
 * - Auto-advances after a tap or a few seconds
 * - Big "Get started" on last slide
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Plane, Heart, Volume2, ArrowRight } from "lucide-react";
import { PrimaryButton } from "../ui/PrimaryButton";
import { speak } from "../../hooks/useSpeech";
import { NavFn } from "../../types";

interface OnboardingScreenProps {
  navigate: NavFn;
  /** 1, 2, or 3 */
  step: 1 | 2 | 3;
}

const SLIDES = [
  {
    icon: Mic,
    title: "Voice-first",
    body: "Just speak. We'll book your flight, read back the details, and confirm — all by voice.",
    speak: "Voice first. Just speak. We will book your flight, read back the details, and confirm, all by voice.",
  },
  {
    icon: Plane,
    title: "Real-time flights",
    body: "Search 7,000+ destinations. Cheapest options, read aloud to you automatically.",
    speak: "Real time flights. Search 7,000 destinations. Cheapest options, read aloud to you automatically.",
  },
  {
    icon: Heart,
    title: "Built for everyone",
    body: "Designed for blind and visually impaired travelers. Large buttons, high contrast, full screen-reader support.",
    speak: "Built for everyone. Designed for blind and visually impaired travelers. Large buttons, high contrast, full screen reader support.",
  },
];

export function OnboardingScreen({ navigate, step }: OnboardingScreenProps) {
  const [internalStep, setInternalStep] = useState(step - 1);
  const slide = SLIDES[internalStep];
  const Icon = slide.icon;
  const isLast = internalStep === SLIDES.length - 1;

  useEffect(() => {
    speak({ text: slide.speak });
  }, [internalStep, slide.speak]);

  function handleNext() {
    if (isLast) {
      navigate("home");
    } else {
      setInternalStep((s) => s + 1);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "#0B1020" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={internalStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center mb-8"
            style={{
              background: "linear-gradient(135deg,#4F46E5,#22C55E)",
              boxShadow: "0 20px 60px rgba(79,70,229,0.4)",
            }}
            aria-hidden="true"
          >
            <Icon size={56} color="#fff" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-4">{slide.title}</h1>
          <p className="text-lg text-slate-300 max-w-sm leading-relaxed mb-8">
            {slide.body}
          </p>
          <button
            type="button"
            onClick={() => speak({ text: slide.speak })}
            aria-label="Read this slide aloud"
            className="
              w-[60px] h-[60px] rounded-full
              flex items-center justify-center
              bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              mb-12
            "
          >
            <Volume2 size={26} color="#A5B4FC" aria-hidden="true" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex items-center gap-2 mb-8" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === internalStep ? "w-8 bg-indigo-400" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-xs">
        <PrimaryButton
          onClick={handleNext}
          size="xl"
          icon={isLast ? undefined : <ArrowRight size={22} />}
          className="w-full"
        >
          {isLast ? "Get started" : "Next"}
        </PrimaryButton>
        {!isLast && (
          <button
            type="button"
            onClick={() => navigate("home")}
            className="mt-4 w-full text-base text-slate-400 hover:text-white focus:outline-none focus:ring-4 focus:ring-indigo-400/60 rounded-xl py-3"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
