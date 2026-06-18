/**
 * VoiceScreen — premium voice-first home.
 *
 * Centerpiece of Wayfinder's UX. This is the screen blind users
 * will spend the most time on.
 *
 * Design language:
 * - Massive ambient halo behind the mic (premium depth)
 * - Hero mic button (140px) is the largest, most atmospheric element
 * - Live transcript appears as the user speaks, with elegant entry
 * - AI response card slides in with Doppelrand glass treatment
 * - All text auto-spoken via TTS (TTS stop button visible during speech)
 * - Text fallback for browsers without SpeechRecognition
 * - Reduced motion respected
 * - All accessibility preserved
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Volume2,
  VolumeX,
  X,
  Type,
  ArrowLeft,
  Sparkles,
  Mic,
} from "lucide-react";
import { api } from "../../services/api";
import { useWizard } from "../../hooks/useWizard";
import { useUser } from "../../hooks/useUser";
import { useSpeech, speak, stopSpeaking } from "../../hooks/useSpeech";
import { VoiceMicButton, MicState } from "../ui/VoiceMicButton";
import { VoiceWave } from "../ui/VoiceWave";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";

interface VoiceScreenProps {
  navigate: NavFn;
}

export function VoiceScreen({ navigate }: VoiceScreenProps) {
  const { startSession } = useWizard();
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

  useEffect(() => {
    if (!transcript) return;
    handleCommand(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

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
      const sid = await startSession();
      const res = await api.voiceCommand(text, sid);
      setResponseText(res.response_text);
      setResponseIntent(res.intent);
      setParams(res.parameters || {});

      setIsSpeaking(true);
      setState("speaking");
      speak({
        text: res.response_text,
        onEnd: () => {
          setIsSpeaking(false);
          setState("success");
          setTimeout(() => handleIntentRoute(res.intent, res.parameters || {}), 1500);
        },
      });
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
      className="min-h-[100dvh] pb-32 relative overflow-hidden"
      style={{ background: tokens.color.bg.deep }}
    >
      {/* Ambient halo behind the mic */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "8%",
          left: "50%",
          transform: "translate(-50%, 0)",
          width: "min(500px, 130vw)",
          height: "min(500px, 130vw)",
          background:
            state === "listening"
              ? "radial-gradient(circle, rgba(239,68,68,0.20) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(34,197,94,0.10) 40%, transparent 70%)",
          filter: "blur(30px)",
          transition: "background 600ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        aria-hidden="true"
      />

      {/* Top bar */}
      <div
        className="sticky top-0 z-20 px-5 pt-4 pb-3 flex items-center gap-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("home")}
          aria-label="Back to home"
          className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] transition-colors"
        >
          <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white" style={{ ...type.h3, fontWeight: 700 }}>
            Voice Assistant
          </h1>
          <p className="text-slate-400 truncate" style={type.bodySm}>
            Say anything to {profile.name.split(" ")[0]}
          </p>
        </div>
        {isSpeaking && (
          <button
            type="button"
            onClick={handleStopSpeaking}
            aria-label="Stop reading aloud"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 focus:outline-none focus:ring-4 focus:ring-emerald-400/70 transition-colors"
          >
            <VolumeX size={26} color="#A7F3D0" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative px-5 pt-6 flex flex-col items-center">
        {/* Hint when idle */}
        <AnimatePresence mode="wait">
          {state === "idle" && !responseText && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-10"
            >
              <p className="text-indigo-300 mb-2" style={type.eyebrow}>
                Try saying
              </p>
              <p
                className="text-white"
                style={{ ...type.h3, fontWeight: 600, letterSpacing: "-0.01em" }}
              >
                "Book a flight from London to Paris tomorrow"
              </p>
              <p className="text-slate-400 mt-3" style={type.bodySm}>
                or "Show my trips" • "Cancel my booking"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero mic button */}
        <div className="my-4">
          <VoiceMicButton
            state={state}
            onClick={handleMicPress}
            autoFocus
            size="xl"
          />
        </div>

        {/* Waveform */}
        <div className="h-20 flex items-center justify-center mt-2 mb-8">
          <VoiceWave active={state === "listening"} size="lg" />
        </div>

        {/* Live transcript */}
        <AnimatePresence>
          {(transcript || speech.interimTranscript) && state !== "speaking" && (
            <motion.div
              key="transcript"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full mb-4"
            >
              <Card variant="default" padding="md" ariaLabel="You said">
                <p className="text-slate-400 mb-2" style={type.eyebrow}>
                  You said
                </p>
                <p
                  className="text-white"
                  style={{ ...type.h3, fontWeight: 600, letterSpacing: "-0.01em" }}
                >
                  {transcript}
                  {speech.interimTranscript && (
                    <span className="text-slate-400 italic"> {speech.interimTranscript}</span>
                  )}
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI response card */}
        <AnimatePresence>
          {responseText && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full mb-4"
            >
              <Card variant="tinted" padding="md" ariaLabel="Assistant response">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: tokens.gradient.brand }}
                    aria-hidden="true"
                  >
                    <Sparkles size={16} color="#fff" />
                  </div>
                  <p className="text-indigo-300" style={type.eyebrow}>
                    Assistant
                  </p>
                  {isSpeaking && (
                    <span
                      className="ml-auto flex items-center gap-1.5 text-emerald-300"
                      style={type.caption}
                    >
                      <Volume2 size={12} aria-hidden="true" />
                      <span>Reading aloud</span>
                    </span>
                  )}
                </div>
                <p
                  className="text-white"
                  style={{ ...type.bodyLg, fontWeight: 500, lineHeight: 1.55 }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {responseText}
                </p>
                {responseIntent && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {responseIntent === "search_flights" && params?.offer_count ? (
                      <>
                        <Button
                          onClick={() => navigate("results", params)}
                          size="md"
                          variant="primary"
                          icon={<Sparkles size={16} />}
                        >
                          See {params.offer_count} flights
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => speak({ text: responseText })}
                          icon={<Volume2 size={16} />}
                        >
                          Read again
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => speak({ text: responseText })}
                        icon={<Volume2 size={16} />}
                      >
                        Read again
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text fallback */}
        {showTextFallback && state === "idle" && !responseText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full mt-2"
          >
            <Card variant="default" padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Type size={18} className="text-slate-300" aria-hidden="true" />
                <p className="text-slate-300" style={type.label}>
                  {speech.isSupported ? "Type your command" : "Voice not supported — type"}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTyped();
                  }
                }}
                placeholder='e.g. "Book a flight from London to Paris tomorrow"'
                rows={3}
                className="w-full rounded-xl bg-black/30 border border-white/10 p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 focus:border-indigo-300/60 resize-none"
                style={type.body}
              />
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleSendTyped}
                  disabled={!typedInput.trim()}
                  size="md"
                  icon={<Send size={16} />}
                  className="flex-1"
                >
                  Send
                </Button>
                {speech.isSupported && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setShowTextFallback(false);
                      handleMicPress();
                    }}
                    icon={<Mic size={16} />}
                  >
                    Voice
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {!responseText && !showTextFallback && (
          <button
            type="button"
            onClick={() => setShowTextFallback(true)}
            className="mt-6 text-slate-400 hover:text-white underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 rounded-lg px-3 py-2"
            style={type.bodySm}
          >
            Type instead
          </button>
        )}

        {(responseText || transcript) && state !== "listening" && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-4 inline-flex items-center gap-2 text-slate-400 hover:text-white focus:outline-none focus:ring-4 focus:ring-indigo-300/60 rounded-lg px-3 py-2"
            style={type.bodySm}
          >
            <X size={16} aria-hidden="true" />
            <span>Start over</span>
          </button>
        )}
      </div>
    </div>
  );
}
