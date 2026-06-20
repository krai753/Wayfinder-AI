import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { api } from "../../services/api";

type VoiceState = "initial" | "idle" | "listening" | "processing" | "result";

function VoiceWave({ active, size = "md" }: { active: boolean; size?: "sm" | "md" | "lg" }) {
  const bars = size === "lg" ? 9 : size === "md" ? 7 : 5;
  const heights = [30, 50, 70, 90, 100, 90, 70, 50, 30];
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: size === "lg" ? 5 : size === "md" ? 4 : 3,
            background: active ? "linear-gradient(180deg,#4F46E5,#22C55E)" : "rgba(255,255,255,0.2)",
          }}
          animate={active ? {
            height: [heights[i] * 0.3, heights[i], heights[i] * 0.5, heights[i] * 0.8, heights[i] * 0.3],
          } : { height: size === "lg" ? 8 : 6 }}
          transition={active ? {
            duration: 0.8 + i * 0.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

function generateGreeting(): string {
  const hour = new Date().getHours();
  let timeGreeting: string;
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";
  else timeGreeting = "Good evening";

  const greetings = [
    `${timeGreeting}, and welcome to Wayfinder. Where would you like to go today?`,
    `${timeGreeting}! Welcome to Wayfinder. I'm your travel assistant. Where can I take you?`,
    `${timeGreeting} and welcome. I'm Wayfinder, your voice travel companion. Tell me where you'd like to fly!`,
    `${timeGreeting}! Ready for your next trip? Just say something like "Book a flight from London to Paris tomorrow".`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export default function VoiceScreen({ onNavigate }: { onNavigate: (screen: string, data?: any) => void }) {
  const [state, setState] = useState<VoiceState>("initial");
  const [transcript, setTranscript] = useState("");
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [intent, setIntent] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── PLAY AUDIO (always within a user-gesture context) ─────────

  const playTts = useCallback(async (text: string): Promise<void> => {
    try {
      const blob = await api.speak(text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      return new Promise((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        // Chrome/Safari may still block if no user gesture — resolve either way
        audio.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
      });
    } catch {
      return;
    }
  }, []);

  // ── PLAY GREETING ON FIRST MIC TAP ─────────────────────────────

  const playGreeting = useCallback(async () => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    setState("idle");
    const greeting = generateGreeting();
    await playTts(greeting);
  }, [playTts]);

  // ── VOICE COMMAND HANDLING ─────────────────────────────────────

  const handleVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setTranscript(text);
    setState("processing");
    setError("");

    try {
      const result = await api.voiceCommand(text, sessionId);
      setIntent(result.intent);
      setParameters(result.parameters || {});
      if (result.parameters?.session_id) {
        setSessionId(result.parameters.session_id);
      }

      setState("result");
      await playTts(result.response_text);

      // Navigate to results if we have flight offers
      if (
        (result.intent === "search_flights" || result.intent === "search_with_budget") &&
        result.parameters?.offers?.length > 0
      ) {
        onNavigate("results", { parameters: result.parameters, intent: result.intent });
        return;
      }

      // Stay on page for further conversation
      setState("idle");
      setTranscript("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setState("idle");
    }
  }, [playTts, sessionId, onNavigate]);

  // ── SPEECH RECOGNITION ────────────────────────────────────────

  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(async () => {
    // Play greeting on first tap, then start listening
    if (!hasGreeted.current) {
      await playGreeting();
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Your browser doesn't support speech recognition. Please type instead.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        if (event.results[last].isFinal) {
          setTranscript(text);
          handleVoiceCommand(text);
        } else {
          setTranscript(text);
        }
      };

      recognition.onerror = (event: any) => {
        setState("idle");
        const msg = event.error === "no-speech"
          ? "No speech detected. Please try again or type your command."
          : event.error === "aborted"
            ? ""
            : `Speech error: ${event.error}. Please type instead.`;
        if (msg) setError(msg);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setState(prev => prev === "listening" || prev === "initial" ? "idle" : prev);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setState("listening");
      setError("");
    } catch (err) {
      setState("idle");
      setError("Microphone access denied. Allow mic in browser settings, or type your command below.");
    }
  }, [handleVoiceCommand, playGreeting]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState("idle");
  }, []);

  // ── TAP-AND-HOLD (push to talk) ───────────────────────────────

  const handlePointerDown = useCallback(() => {
    holdTimer.current = setTimeout(() => {
      // Long press → start listening
      startListening();
    }, 150); // 150ms hold threshold
  }, [startListening]);

  const handlePointerUp = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    // If we were listening and user releases → stop
    if (recognitionRef.current) {
      stopListening();
    }
  }, [stopListening]);

  // ── TEXT INPUT FALLBACK ───────────────────────────────────────

  const handleSubmitText = () => {
    if (inputText.trim()) {
      // If greeting hasn't played yet, play it first
      if (!hasGreeted.current) {
        playGreeting().then(() => {
          handleVoiceCommand(inputText);
          setInputText("");
        });
        return;
      }
      handleVoiceCommand(inputText);
      setInputText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmitText();
  };

  const handleReset = () => {
    setState("initial");
    setTranscript("");
    setParameters({});
    setIntent("");
    setError("");
    hasGreeted.current = false;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button
          onClick={() => onNavigate("home")}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={20} color="#94A3B8" />
        </button>
        <h1 className="text-lg font-bold text-white">Wayfinder</h1>
        <div className="flex-1" />
        <span
          className="text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full"
          style={{
            background: state === "listening" ? "rgba(79,70,229,0.15)" : "rgba(255,255,255,0.05)",
            color: state === "listening" ? "#818CF8" : "#64748B",
            border: `1px solid ${state === "listening" ? "rgba(79,70,229,0.2)" : "rgba(255,255,255,0.06)"}`,
          }}
        >
          {state === "initial" ? "Ready" : state === "listening" ? "Listening" : state === "processing" ? "Thinking" : state === "result" ? "Speaking" : "Ready"}
        </span>
      </div>

      <div className="flex-1 px-5 pb-8 flex flex-col items-center justify-center">
        {/* ── INITIAL / IDLE — TAP & HOLD TO SPEAK ──────────── */}
        {(state === "initial" || state === "idle") && (
          <div className="flex flex-col items-center gap-6">
            {/* BIG MIC — tap & hold to talk */}
            <motion.button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              onClick={() => {
                // Tap (not hold) → play greeting on first tap, then start listening
                if (state === "initial") {
                  startListening();
                }
              }}
              className="w-52 h-52 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50 active:scale-90 transition-transform select-none"
              style={{
                background: "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(99,102,241,0.1))",
                border: "3px solid rgba(79,70,229,0.3)",
                boxShadow: "0 0 30px rgba(79,70,229,0.2)",
              }}
              whileTap={{ scale: 0.9 }}
            >
              <Mic size={72} color="#fff" />
            </motion.button>
            <VoiceWave active={false} size="lg" />
            {state === "initial" ? (
              <>
                <p className="text-lg font-bold text-white">Tap to speak</p>
                <p className="text-sm text-[#64748B] -mt-2">Hold to talk · Release to stop</p>
              </>
            ) : (
              <p className="text-lg font-bold text-white">Tap & speak</p>
            )}
          </div>
        )}

        {/* ── LISTENING ──────────────────────────────────── */}
        {state === "listening" && (
          <div className="flex flex-col items-center gap-6">
            <motion.button
              onClick={stopListening}
              className="w-52 h-52 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50"
              style={{
                background: "linear-gradient(135deg,#4F46E5,#6366f1)",
                border: "3px solid rgba(255,255,255,0.2)",
                boxShadow: "0 0 50px rgba(79,70,229,0.5)",
              }}
              whileTap={{ scale: 0.9 }}
            >
              <MicOff size={72} color="#fff" />
            </motion.button>
            <VoiceWave active={true} size="lg" />
            <p className="text-lg font-bold text-[#4F46E5]">Listening...</p>
            {transcript && (
              <p className="text-sm italic text-white/60 max-w-xs text-center">
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* ── PROCESSING ─────────────────────────────────── */}
        {state === "processing" && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.15),rgba(99,102,241,0.08))", border: "2px solid rgba(79,70,229,0.2)" }}
            >
              <Loader2 size={64} color="#4F46E5" className="animate-spin" />
            </div>
            <p className="text-lg font-bold text-white">Thinking...</p>
            {transcript && (
              <p className="text-sm italic text-white/60 max-w-xs text-center">
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* ── RESULT (speaking the response) ─────────────── */}
        {state === "result" && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.08))", border: "2px solid rgba(34,197,94,0.2)" }}
            >
              <Loader2 size={64} color="#22C55E" className="animate-spin" />
            </div>
            <p className="text-lg font-bold text-emerald-400">Speaking...</p>
          </div>
        )}

        {/* ── ERROR ──────────────────────────────────────── */}
        {error && (
          <div
            className="mt-6 rounded-xl px-5 py-4 text-center max-w-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={handleReset} className="text-xs font-medium text-white mt-2 underline focus:outline-none">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* ── TEXT INPUT BAR (accessibility fallback) ──────────── */}
      <div
        className="mx-5 mb-6 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <motion.button
          onClick={state === "listening" ? stopListening : startListening}
          disabled={state === "processing"}
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40 ${state === "listening" ? "bg-gradient-to-br from-[#4F46E5] to-[#6366f1]" : "bg-white/10"}`}
          whileTap={{ scale: 0.9 }}
        >
          {state === "listening" ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
        </motion.button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={state === "listening" ? "Speak now..." : "Type your message..."}
          className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
        />

        <button
          onClick={handleSubmitText}
          disabled={!inputText.trim() || state === "processing"}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{ background: inputText.trim() ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "transparent" }}
        >
          <ChevronRight size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}