/**
 * VoiceScreen — the home of the voice-first experience.
 *
 * Behaviour:
 * - On mount, the giant mic button auto-focuses.
 * - Tap (or Space/Enter) to start listening.
 * - Browser SpeechRecognition captures the user's voice (with Web Speech API).
 * - If browser doesn't support STT, fall back to a large text input.
 * - Once a final transcript is captured, send to /api/voice/command.
 * - Show the response card and auto-speak it via SpeechSynthesis.
 * - "Read aloud" / "Stop reading" controls.
 * - Always offer a "Type instead" escape hatch and "Back to home".
 *
 * Accessibility:
 * - The mic is auto-focused and is the largest interactive element.
 * - The state banner is an aria-live region.
 * - The transcript is in a labelled live region so screen readers announce it.
 * - The response card has a polite live region so the response is announced.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Volume2, VolumeX, X, Type, ArrowLeft, Sparkles, Mic } from "lucide-react";
import { api } from "../../services/api";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { useSpeech, speak, stopSpeaking } from "../../hooks/useSpeech";
import { VoiceMicButton, MicState } from "../ui/VoiceMicButton";
import { VoiceWave } from "../ui/VoiceWave";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";

interface VoiceScreenProps {
  navigate: NavFn;
}

export function VoiceScreen({ navigate }: VoiceScreenProps) {
  const { startSession, origin, destination, departureDate } = useWizard();
  const { profile } = useUser();
  const [state, setState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [responseIntent, setResponseIntent] = useState<string>("");
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setTranscript((prev) => (prev + " " + text).trim());
      }
    },
    onError: () => {
      setShowTextFallback(true);
    },
  });

  // When final transcript is captured, send to backend
  useEffect(() => {
    if (!transcript) return;
    handleCommand(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // If browser has no STT, show text fallback immediately
  useEffect(() => {
    if (!speech.isSupported) {
      setShowTextFallback(true);
    }
  }, [speech.isSupported]);

  async function handleCommand(text: string) {
    setState("processing");
    setResponseText("");
    setParams(null);
    try {
      // Ensure we have a wizard session
      const sid = await startSession();
      const res = await api.voiceCommand(text, sid);
      setResponseText(res.response_text);
      setResponseIntent(res.intent);
      setParams(res.parameters || {});

      // Auto-speak the response
      setIsSpeaking(true);
      setState("speaking");
      speak({
        text: res.response_text,
        onEnd: () => {
          setIsSpeaking(false);
          setState("success");
          // Auto-route to the right screen for known intents
          setTimeout(() => handleIntentRoute(res.intent, res.parameters || {}), 1200);
        },
      });

      // If the response contains flight offers, also cache them
      if (res.parameters?.offers && Array.isArray(res.parameters.offers)) {
        // The wizard hook will fetch on its own when arriving at results.
      }
    } catch (e: any) {
      setState("error");
      setResponseText(
        e?.message
          ? `Sorry, I couldn't reach the assistant. ${e.message}. Please try again.`
          : "Sorry, I couldn't reach the assistant. Please try again."
      );
    }
  }

  function handleIntentRoute(intent: string, p: Record<string, any>) {
    if (intent === "search_flights" || intent === "search_with_budget") {
      navigate("results", { origin: p.origin, destination: p.destination, date: p.date });
    } else if (intent === "view_history") {
      navigate("bookings");
    } else if (intent === "view_portfolio") {
      navigate("profile", { tab: "stats" });
    } else if (intent === "book_flight") {
      navigate("review");
    } else {
      // Help, cancel, reschedule: stay on voice screen
    }
  }

  function handleMicPress() {
    if (state === "listening") {
      speech.stopListening();
      setState("idle");
    } else if (state === "idle" || state === "success" || state === "error") {
      setTranscript("");
      setResponseText("");
      setResponseIntent("");
      setParams(null);
      stopSpeaking();
      setIsSpeaking(false);
      setState("listening");
      speech.startListening();
    }
  }

  function handleSendTyped() {
    const text = typedInput.trim();
    if (!text) return;
    setTypedInput("");
    setShowTextFallback(false);
    setTranscript(text);
  }

  function handleStopSpeaking() {
    stopSpeaking();
    setIsSpeaking(false);
    setState("success");
  }

  function handleClear() {
    setTranscript("");
    setResponseText("");
    setResponseIntent("");
    setParams(null);
    stopSpeaking();
    setIsSpeaking(false);
    setState("idle");
  }

  return (
    <div
      className="min-h-screen w-full pb-32"
      style={{ background: "#0B1020" }}
    >
      {/* Top bar with back button */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("home")}
          aria-label="Back to home"
          className="
            w-[60px] h-[60px] rounded-full shrink-0
            flex items-center justify-center
            bg-white/8 hover:bg-white/12 active:bg-white/16
            border border-white/10
            focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
          "
        >
          <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-white">Voice Assistant</h1>
          <p className="text-sm text-slate-400">Say anything to {profile.name.split(" ")[0]}</p>
        </div>
        {isSpeaking && (
          <button
            type="button"
            onClick={handleStopSpeaking}
            aria-label="Stop reading aloud"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-emerald-500/20 hover:bg-emerald-500/30
              border border-emerald-400/30
              focus:outline-none focus:ring-4 focus:ring-emerald-400/70
            "
          >
            <VolumeX size={26} color="#A7F3D0" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="px-5 pt-4 flex flex-col items-center">
        {/* Greeting / hint */}
        <AnimatePresence mode="wait">
          {state === "idle" && !responseText && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-8"
            >
              <p className="text-sm text-indigo-300 uppercase tracking-widest font-semibold mb-2">
                Try saying
              </p>
              <p className="text-lg text-white font-medium leading-relaxed">
                "Book a flight from London to Paris tomorrow"
              </p>
              <p className="text-base text-slate-400 mt-2">
                or "Show my trips" • "Cancel my booking"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Big mic button (auto-focuses on mount) */}
        <div className="my-4">
          <VoiceMicButton
            state={state}
            onClick={handleMicPress}
            autoFocus
            size="xl"
          />
        </div>

        {/* Animated waveform below mic */}
        <div className="h-20 flex items-center justify-center mt-2 mb-6">
          <VoiceWave active={state === "listening"} size="lg" />
        </div>

        {/* Live transcript area */}
        <AnimatePresence>
          {(transcript || speech.interimTranscript) && state !== "speaking" && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full mb-4"
            >
              <GlassCard className="p-5" ariaLabel="You said">
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
                  You said
                </p>
                <p className="text-xl text-white font-semibold leading-relaxed">
                  {transcript}
                  {speech.interimTranscript && (
                    <span className="text-slate-400 italic"> {speech.interimTranscript}</span>
                  )}
                </p>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Response card */}
        <AnimatePresence>
          {responseText && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full mb-4"
            >
              <GlassCard
                className="p-5"
                ariaLabel="Assistant response"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(79,70,229,0.4), rgba(34,197,94,0.4))",
                    }}
                    aria-hidden="true"
                  >
                    <Sparkles size={18} color="#A5B4FC" />
                  </div>
                  <p className="text-xs uppercase tracking-widest font-bold text-indigo-300">
                    Assistant
                  </p>
                  {isSpeaking && (
                    <span className="ml-auto flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
                      <Volume2 size={14} aria-hidden="true" />
                      <span>Reading aloud</span>
                    </span>
                  )}
                </div>
                <p
                  className="text-xl text-white font-medium leading-relaxed"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {responseText}
                </p>
                {/* Quick intent chips */}
                {responseIntent && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {responseIntent === "search_flights" && params?.offer_count ? (
                      <>
                        <PrimaryButton
                          size="md"
                          onClick={() => navigate("results", params)}
                          icon={<Sparkles size={18} />}
                        >
                          See {params.offer_count} flights
                        </PrimaryButton>
                        <PrimaryButton
                          variant="secondary"
                          size="md"
                          onClick={() => speak({ text: responseText })}
                          icon={<Volume2 size={18} />}
                        >
                          Read again
                        </PrimaryButton>
                      </>
                    ) : responseIntent === "view_history" ? (
                      <PrimaryButton
                        size="md"
                        onClick={() => navigate("bookings")}
                      >
                        Open my trips
                      </PrimaryButton>
                    ) : responseIntent === "help" ? (
                      <PrimaryButton
                        variant="secondary"
                        size="md"
                        onClick={() => speak({ text: responseText })}
                        icon={<Volume2 size={18} />}
                      >
                        Read again
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton
                        variant="secondary"
                        size="md"
                        onClick={() => speak({ text: responseText })}
                        icon={<Volume2 size={18} />}
                      >
                        Read again
                      </PrimaryButton>
                    )}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text fallback (if browser doesn't support STT) */}
        {showTextFallback && state === "idle" && !responseText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full mt-2"
          >
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Type size={18} className="text-slate-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-300">
                  {speech.isSupported
                    ? "Type your command"
                    : "Voice not supported — type your command"}
                </p>
              </div>
              <label htmlFor="voice-typed-input" className="sr-only">
                Type your command
              </label>
              <textarea
                id="voice-typed-input"
                ref={inputRef}
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder='e.g. "Book a flight from London to Paris tomorrow"'
                rows={3}
                className="
                  w-full rounded-xl bg-black/30 border border-white/10
                  p-4 text-base text-white placeholder:text-slate-500
                  focus:outline-none focus:ring-4 focus:ring-indigo-400/60 focus:border-indigo-400/60
                  resize-none
                "
              />
              <div className="mt-3 flex gap-2">
                <PrimaryButton
                  onClick={handleSendTyped}
                  disabled={!typedInput.trim()}
                  size="md"
                  icon={<Send size={18} />}
                  className="flex-1"
                >
                  Send
                </PrimaryButton>
                {speech.isSupported && (
                  <PrimaryButton
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setShowTextFallback(false);
                      handleMicPress();
                    }}
                    icon={<Mic size={18} />}
                  >
                    Voice
                  </PrimaryButton>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Helper tip when nothing else is on screen */}
        {!responseText && !showTextFallback && (
          <button
            type="button"
            onClick={() => setShowTextFallback(true)}
            className="mt-6 text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-400/60 rounded-lg px-3 py-2"
          >
            Type instead
          </button>
        )}

        {/* Clear / start over */}
        {(responseText || transcript) && state !== "listening" && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white focus:outline-none focus:ring-4 focus:ring-indigo-400/60 rounded-lg px-3 py-2"
          >
            <X size={16} aria-hidden="true" />
            <span>Start over</span>
          </button>
        )}
      </div>
    </div>
  );
}
