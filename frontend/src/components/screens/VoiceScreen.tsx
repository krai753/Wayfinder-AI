import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, ArrowLeft, Loader2, Volume2, CheckCircle, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

// ── Voice State Machine ──────────────────────────────────────
//
//  INITIAL → (tap mic) → RECORDING → (release) → TRANSCRIBING
//    ↑                                          → PROCESSING
//    ↑  (tap mic again)                           → SPEAKING (TTS)
//    ↑                                              ↓
//    ↑ ←──── AUTO-LISTEN (if not complete) ←───────┘
//    ↑
//    └────────── BOOKING_COMPLETE (done)

type VoiceState =
  | "initial"
  | "recording"
  | "transcribing"
  | "processing"
  | "speaking"
  | "auto_listening"
  | "booking_complete";

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
            background: active
              ? "linear-gradient(180deg,#4F46E5,#22C55E)"
              : "rgba(255,255,255,0.2)",
          }}
          animate={
            active
              ? {
                  height: [
                    heights[i] * 0.3,
                    heights[i],
                    heights[i] * 0.5,
                    heights[i] * 0.8,
                    heights[i] * 0.3,
                  ],
                }
              : { height: size === "lg" ? 8 : 6 }
          }
          transition={
            active
              ? {
                  duration: 0.8 + i * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.08,
                }
              : { duration: 0.3 }
          }
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
    `${timeGreeting}, and welcome to Wayfinder. Where would you like to go today? Just tap and hold the mic to speak.`,
    `${timeGreeting}! Welcome to Wayfinder. I'm your voice travel assistant. Hold the mic button and tell me where you'd like to fly.`,
    `${timeGreeting} and welcome. I'm Wayfinder, your voice travel companion. Tap and hold the mic to book a flight.`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export default function VoiceScreen({
  onNavigate,
}: {
  onNavigate: (screen: string, data?: any) => void;
}) {
  const [state, setState] = useState<VoiceState>("initial");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [conversationLog, setConversationLog] = useState<string[]>([]);
  const [bookingResult, setBookingResult] = useState<Record<string, any> | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const audioUnlocked = useRef(false);
  const greetingText = useRef(generateGreeting());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoListenRef = useRef(false);
  const sessionIdRef = useRef("");

  // ── UNLOCK AUDIO ──────────────────────────────────────────

  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current) return true;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.01);
      audioUnlocked.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── PLAY TTS ──────────────────────────────────────────────

  const playTts = useCallback(
    async (text: string): Promise<void> => {
      try {
        unlockAudio();
        setConversationLog((prev) => [...prev, `🤖 ${text}`]);
        const blob = await api.speak(text);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch(() => {
              URL.revokeObjectURL(url);
              setAudioBlocked(true);
              resolve();
            });
          }
        });
      } catch {
        return;
      }
    },
    [unlockAudio]
  );

  // ── START RECORDING (MediaRecorder → Whisper) ─────────────

  const startRecording = useCallback(async () => {
    try {
      setError("");

      // Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Find best audio format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop the mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Only process if we have audio
        if (audioChunksRef.current.length === 0) return;

        setState("transcribing");
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        try {
          // Send to Whisper via backend
          const result = await api.listen(audioBlob, "recording.webm");
          const transcript = result.transcript;

          if (!transcript || transcript.trim().length === 0) {
            setError("No speech detected. Please try again.");
            setState(autoListenRef.current ? "auto_listening" : "initial");
            return;
          }

          setConversationLog((prev) => [...prev, `🎤 ${transcript}`]);
          setState("processing");

          // Send text to voice command API
          const sid = sessionIdRef.current;
          const cmdResult = await api.voiceCommand(transcript, sid || undefined);

          // Save session ID for continued conversation
          if (cmdResult.parameters?.session_id) {
            setSessionId(cmdResult.parameters.session_id);
            sessionIdRef.current = cmdResult.parameters.session_id;
          }

          // Speak the response
          setState("speaking");
          await playTts(cmdResult.response_text);

          // After TTS: decide what to do next
          const isComplete = cmdResult.parameters?.booking_complete === true;

          if (isComplete) {
            // Booking done!
            setBookingResult(cmdResult.parameters);
            setState("booking_complete");
          } else if (
            cmdResult.intent === "search_flights" &&
            cmdResult.parameters?.offers?.length > 0
          ) {
            // Had flight results — auto-listen for selection
            autoListenRef.current = true;
            setState("auto_listening");
            // Small delay then auto-record
            setTimeout(() => {
              if (autoListenRef.current) {
                startRecording();
              }
            }, 800);
          } else if (
            cmdResult.intent === "select_flight" ||
            cmdResult.intent === "provide_name"
          ) {
            // Waiting for next input — auto-listen
            autoListenRef.current = true;
            setState("auto_listening");
            setTimeout(() => {
              if (autoListenRef.current) {
                startRecording();
              }
            }, 800);
          } else if (cmdResult.intent === "help") {
            // Help shown — wait for user to tap again
            autoListenRef.current = false;
            setState("initial");
          } else {
            // Default: wait for user input
            autoListenRef.current = false;
            setState("initial");
          }
        } catch (err: any) {
          setError(err.message || "Something went wrong with transcription.");
          setState(autoListenRef.current ? "auto_listening" : "initial");
        }
      };

      recorder.start();
      setState("recording");
    } catch {
      setState("initial");
      setError(
        "Microphone access denied. Allow mic in browser settings, or type below."
      );
    }
  }, [playTts]);

  // ── STOP RECORDING ────────────────────────────────────────

  const stopRecording = useCallback(() => {
    autoListenRef.current = false;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    // Also stop stream if recorder didn't fire onstop
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ── RESET ─────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    autoListenRef.current = false;
    stopRecording();
    setState("initial");
    setError("");
    setConversationLog([]);
    setBookingResult(null);
    setAudioBlocked(false);
    setSessionId("");
    sessionIdRef.current = "";
    greetingText.current = generateGreeting();
  }, [stopRecording]);

  // ── PLAY GREETING ─────────────────────────────────────────

  const playGreeting = useCallback(async () => {
    await playTts(greetingText.current);
  }, [playTts]);

  // ── MIC BUTTON HANDLER ────────────────────────────────────

  const handleMicTap = useCallback(async () => {
    unlockAudio();
    if (state === "initial" || state === "booking_complete") {
      if (state === "booking_complete") {
        handleReset();
        // Small delay then start
        setTimeout(() => startRecording(), 300);
        return;
      }
      await playGreeting();
      await startRecording();
    }
  }, [state, unlockAudio, playGreeting, startRecording, handleReset]);

  const handleMicPress = useCallback(() => {
    if (state === "auto_listening") {
      autoListenRef.current = false;
      stopRecording();
      // Restart fresh
      setTimeout(() => startRecording(), 200);
    } else if (state === "recording") {
      // Already recording — do nothing on press
    } else if (state === "initial") {
      // Will be handled by the onClick (greeting + record)
    }
  }, [state, stopRecording, startRecording]);

  // ── TEXT INPUT ────────────────────────────────────────────

  const handleSubmitText = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");
    unlockAudio();

    setConversationLog((prev) => [...prev, `⌨️ ${text}`]);
    setState("processing");

    try {
      const sid = sessionIdRef.current;
      const result = await api.voiceCommand(text, sid || undefined);

      if (result.parameters?.session_id) {
        setSessionId(result.parameters.session_id);
        sessionIdRef.current = result.parameters.session_id;
      }

      setState("speaking");
      await playTts(result.response_text);

      if (result.parameters?.booking_complete === true) {
        setBookingResult(result.parameters);
        setState("booking_complete");
      } else {
        setState("initial");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setState("initial");
    }
  }, [inputText, unlockAudio, playTts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmitText();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoListenRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── STATE LABEL ───────────────────────────────────────────

  const stateLabel = (() => {
    switch (state) {
      case "initial":
        return "Ready";
      case "recording":
        return "Listening";
      case "transcribing":
        return "Transcribing";
      case "processing":
        return "Thinking";
      case "speaking":
        return "Speaking";
      case "auto_listening":
        return "Listening";
      case "booking_complete":
        return "Booked!";
    }
  })();

  // ── RENDER ────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button
          onClick={() => {
            autoListenRef.current = false;
            stopRecording();
            onNavigate("home");
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={20} color="#94A3B8" />
        </button>
        <h1 className="text-lg font-bold text-white">Wayfinder Voice</h1>
        <div className="flex-1" />
        <span
          className="text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full"
          style={{
            background:
              state === "recording" || state === "auto_listening"
                ? "rgba(79,70,229,0.15)"
                : "rgba(255,255,255,0.05)",
            color: state === "recording" || state === "auto_listening" ? "#818CF8" : "#64748B",
            border:
              state === "recording" || state === "auto_listening"
                ? "1px solid rgba(79,70,229,0.2)"
                : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {stateLabel}
        </span>
      </div>

      <div className="flex-1 px-5 pb-8 flex flex-col items-center justify-center">
        {/* ── VOICE STATES ──────────────────────────────────── */}

        {state === "initial" && (
          <div className="flex flex-col items-center gap-6">
            <motion.button
              onClick={handleMicTap}
              className="w-52 h-52 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50 active:scale-90 transition-transform select-none"
              style={{
                background:
                  "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(99,102,241,0.1))",
                border: "3px solid rgba(79,70,229,0.3)",
                boxShadow: "0 0 30px rgba(79,70,229,0.2)",
              }}
              whileTap={{ scale: 0.9 }}
            >
              {audioBlocked ? <Volume2 size={72} color="#fff" /> : <Mic size={72} color="#fff" />}
            </motion.button>
            <VoiceWave active={false} size="lg" />
            <p className="text-lg font-bold text-white">Tap to speak</p>
            <p className="text-sm text-[#64748B] -mt-2">
              Hold to talk · Release to stop
            </p>
          </div>
        )}

        {(state === "recording" || state === "auto_listening") && (
          <div className="flex flex-col items-center gap-6">
            <motion.button
              onClick={stopRecording}
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
            <p className="text-lg font-bold text-[#4F46E5]">
              {state === "auto_listening" ? "Listening..." : "Recording..."}
            </p>
            {conversationLog.length > 0 && (
              <p className="text-sm italic text-white/60 max-w-xs text-center">
                "{conversationLog[conversationLog.length - 1].replace(/^(🎤|🤖|⌨️) /, "")}"
              </p>
            )}
          </div>
        )}

        {state === "transcribing" && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.08))",
                border: "2px solid rgba(245,158,11,0.2)",
              }}
            >
              <Loader2 size={64} color="#F59E0B" className="animate-spin" />
            </div>
            <p className="text-lg font-bold text-amber-400">Transcribing with Whisper AI...</p>
          </div>
        )}

        {state === "processing" && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg,rgba(79,70,229,0.15),rgba(99,102,241,0.08))",
                border: "2px solid rgba(79,70,229,0.2)",
              }}
            >
              <Loader2 size={64} color="#4F46E5" className="animate-spin" />
            </div>
            <p className="text-lg font-bold text-white">Thinking...</p>
          </div>
        )}

        {state === "speaking" && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.08))",
                border: "2px solid rgba(34,197,94,0.2)",
              }}
            >
              <Loader2 size={64} color="#22C55E" className="animate-spin" />
            </div>
            <p className="text-lg font-bold text-emerald-400">Speaking...</p>
          </div>
        )}

        {state === "booking_complete" && bookingResult && (
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-44 h-44 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1))",
                border: "3px solid rgba(34,197,94,0.3)",
              }}
            >
              <CheckCircle size={72} color="#22C55E" />
            </motion.div>
            <p className="text-lg font-bold text-emerald-400">Flight Booked!</p>
            <div
              className="rounded-xl px-6 py-4 text-center max-w-sm w-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {bookingResult.origin && bookingResult.destination && (
                <p className="text-white font-semibold text-sm">
                  {bookingResult.origin} → {bookingResult.destination}
                </p>
              )}
              {bookingResult.departure_date && (
                <p className="text-[#94A3B8] text-xs mt-1">
                  {bookingResult.departure_date}
                </p>
              )}
              {bookingResult.total_amount && (
                <p className="text-emerald-400 font-bold text-base mt-2">
                  {bookingResult.total_amount}
                </p>
              )}
              {bookingResult.booking_reference && (
                <p className="text-[#64748B] text-xs mt-1">
                  Ref: {bookingResult.booking_reference}
                </p>
              )}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.2)" }}
            >
              <RefreshCw size={16} />
              Book Another Flight
            </button>
          </div>
        )}

        {/* ── CONVERSATION LOG ──────────────────────────────── */}
        {conversationLog.length > 1 && state !== "booking_complete" && (
          <div className="mt-8 w-full max-w-sm max-h-32 overflow-y-auto space-y-1 px-2">
            {conversationLog.map((entry, i) => (
              <p
                key={i}
                className={`text-xs ${
                  entry.startsWith("🎤") || entry.startsWith("⌨️")
                    ? "text-[#818CF8]"
                    : entry.startsWith("🤖")
                    ? "text-[#22C55E]"
                    : "text-[#64748B]"
                }`}
              >
                {entry}
              </p>
            ))}
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────── */}
        {error && (
          <div
            className="mt-6 rounded-xl px-5 py-4 text-center max-w-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={handleReset}
              className="text-xs font-medium text-white mt-2 underline focus:outline-none"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* ── TEXT INPUT BAR (fallback) ────────────────────────────── */}
      <div
        className="mx-5 mb-6 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(21,28,47,0.8)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.button
          onClick={handleMicTap}
          disabled={state === "processing" || state === "transcribing" || state === "speaking"}
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40 ${
            state === "recording" || state === "auto_listening"
              ? "bg-gradient-to-br from-[#4F46E5] to-[#6366f1]"
              : "bg-white/10"
          }`}
          whileTap={{ scale: 0.9 }}
        >
          {state === "recording" || state === "auto_listening" ? (
            <MicOff size={20} color="#fff" />
          ) : (
            <Mic size={20} color="#fff" />
          )}
        </motion.button>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            state === "recording" || state === "auto_listening"
              ? "Speak now..."
              : "Or type your message..."
          }
          className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
        />
        <button
          onClick={handleSubmitText}
          disabled={!inputText.trim() || state === "processing" || state === "transcribing"}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{
            background: inputText.trim()
              ? "linear-gradient(135deg,#4F46E5,#6366f1)"
              : "transparent",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
