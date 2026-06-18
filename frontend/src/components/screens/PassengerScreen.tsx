/**
 * PassengerScreen — collect passenger name + assistance needs.
 *
 * - Voice input for name
 * - 3 large assistance chips: None, Wheelchair, Visual
 * - Continue button is huge (72px) and disabled until name is non-empty
 * - Reads back the name and assistance choice
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  User,
  Accessibility,
  Heart,
  Volume2,
  Mic,
  Check,
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";

interface PassengerScreenProps {
  navigate: NavFn;
}

const ASSISTANCE_OPTIONS: {
  value: "none" | "wheelchair" | "visual";
  label: string;
  description: string;
  icon: typeof Heart;
  spoken: string;
}[] = [
  {
    value: "none",
    label: "No assistance",
    description: "I'll manage on my own",
    icon: Check,
    spoken: "no assistance needed",
  },
  {
    value: "wheelchair",
    label: "Wheelchair",
    description: "I need wheelchair assistance",
    icon: Accessibility,
    spoken: "wheelchair assistance",
  },
  {
    value: "visual",
    label: "Visual assistance",
    description: "I am blind or visually impaired",
    icon: Heart,
    spoken: "visual assistance",
  },
];

export function PassengerScreen({ navigate }: PassengerScreenProps) {
  const {
    selectedOffer,
    passengerName,
    passengerAssistance,
    setPassengerName,
    setPassengerAssistance,
  } = useWizard();
  const [nameInput, setNameInput] = useState(passengerName);
  const [listeningName, setListeningName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const speech = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setNameInput((prev) => (prev + " " + text).trim());
        setPassengerName((nameInput + " " + text).trim());
        setListeningName(false);
      }
    },
    onError: () => setListeningName(false),
  });

  // Auto-focus the name input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // If no selected offer, bounce back to results
  useEffect(() => {
    if (!selectedOffer) navigate("results");
  }, [selectedOffer, navigate]);

  function handleNameChange(v: string) {
    setNameInput(v);
    setPassengerName(v);
  }

  function handleSelectAssistance(value: typeof ASSISTANCE_OPTIONS[number]["value"]) {
    setPassengerAssistance(value);
    const opt = ASSISTANCE_OPTIONS.find((o) => o.value === value);
    if (opt) speak({ text: `${opt.label} selected.` });
  }

  function handleMicName() {
    if (listeningName) {
      speech.stopListening();
      setListeningName(false);
    } else {
      setListeningName(true);
      speech.startListening();
    }
  }

  function handleContinue() {
    if (!passengerName.trim()) return;
    speak({
      text: `Passenger ${passengerName}. ${ASSISTANCE_OPTIONS.find((o) => o.value === passengerAssistance)?.spoken}.`,
    });
    navigate("accessibility");
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.75) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("results")}
            aria-label="Back"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            "
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">Passenger details</h1>
            <p className="text-sm text-slate-400">Your name and any assistance needs</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* Flight summary mini-card */}
        {selectedOffer && (
          <GlassCard className="p-4" ariaLabel="Selected flight">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
              Selected flight
            </p>
            <p className="text-lg font-bold text-white">
              {selectedOffer.airline} {selectedOffer.flight_number}
            </p>
          </GlassCard>
        )}

        {/* Name input */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            Passenger name
          </h2>
          <GlassCard className="p-2">
            <div className="flex items-center gap-2">
              <div
                className="w-[60px] h-[60px] rounded-xl flex items-center justify-center shrink-0 ml-1"
                style={{ background: "rgba(79,70,229,0.18)" }}
                aria-hidden="true"
              >
                <User size={26} className="text-indigo-300" />
              </div>
              <label htmlFor="passenger-name" className="sr-only">
                Passenger full name
              </label>
              <input
                id="passenger-name"
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Full name as on passport"
                autoComplete="name"
                className="
                  flex-1 h-[60px] px-3
                  bg-transparent border-0
                  text-lg text-white placeholder:text-slate-500
                  focus:outline-none
                "
              />
              <button
                type="button"
                onClick={handleMicName}
                aria-label={listeningName ? "Stop voice input for name" : "Speak your name"}
                aria-pressed={listeningName}
                className={`
                  shrink-0 w-[60px] h-[60px] rounded-xl
                  flex items-center justify-center
                  focus:outline-none focus:ring-4 focus:ring-indigo-400/70
                  active:scale-95 transition-all
                  ${
                    listeningName
                      ? "bg-red-500/30 border border-red-400/40"
                      : "bg-indigo-500/20 border border-indigo-400/30"
                  }
                `}
              >
                <Mic
                  size={26}
                  color={listeningName ? "#FCA5A5" : "#A5B4FC"}
                  aria-hidden="true"
                />
              </button>
            </div>
          </GlassCard>
          {nameInput && (
            <button
              type="button"
              onClick={() => speak({ text: `Passenger name: ${nameInput}` })}
              className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
              aria-label="Read name aloud"
            >
              <Volume2 size={16} aria-hidden="true" />
              <span>Read aloud</span>
            </button>
          )}
        </div>

        {/* Assistance */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            Assistance needed
          </h2>
          <div className="space-y-3">
            {ASSISTANCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = passengerAssistance === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectAssistance(opt.value)}
                  aria-pressed={isSelected}
                  aria-label={`${opt.label}. ${opt.description}`}
                  className={`
                    w-full min-h-[80px] rounded-2xl p-4
                    flex items-center gap-4 text-left
                    border transition-all
                    focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
                    ${
                      isSelected
                        ? "bg-indigo-500/20 border-indigo-400/60 ring-2 ring-indigo-400/40"
                        : "bg-white/5 border-white/10 hover:bg-white/8"
                    }
                  `}
                >
                  <div
                    className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg,#4F46E5,#6366f1)"
                        : "rgba(255,255,255,0.06)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon
                      size={28}
                      color={isSelected ? "#fff" : "#A5B4FC"}
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-white">{opt.label}</p>
                    <p className="text-sm text-slate-400">{opt.description}</p>
                  </div>
                  {isSelected && (
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                      aria-hidden="true"
                    >
                      <Check size={20} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        <PrimaryButton
          onClick={handleContinue}
          disabled={!passengerName.trim()}
          size="xl"
          icon={<Check size={22} />}
          className="w-full"
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
