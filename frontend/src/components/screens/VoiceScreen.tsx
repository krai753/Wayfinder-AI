import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, ArrowLeft, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { api } from "../../services/api";

type VoiceState = "greeting" | "idle" | "listening" | "processing" | "result";

interface ChatMessage {
  role: "assistant" | "user";
  text: string;
  parameters?: Record<string, any>;
  intent?: string;
}

function GlassCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/8 backdrop-blur-xl ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
      style={{ background: "rgba(21,28,47,0.7)" }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = "", disabled = false, icon }: {
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 focus:ring-offset-[#0B1020] disabled:opacity-40 ${className}`}
      style={{ background: disabled ? "#2D3B55" : "linear-gradient(135deg,#4F46E5,#6366f1)" }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

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

function MicButton({ size = "lg", active = false, onClick }: { size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"; active?: boolean; onClick?: (e?: React.MouseEvent) => void }) {
  const dims: Record<string, string> = { sm: "w-14 h-14", md: "w-20 h-20", lg: "w-28 h-28", xl: "w-36 h-36", "2xl": "w-44 h-44", "3xl": "w-52 h-52" };
  const iconSize: Record<string, number> = { sm: 20, md: 28, lg: 44, xl: 52, "2xl": 64, "3xl": 72 };
  return (
    <motion.button
      onClick={onClick}
      className={`relative ${dims[size]} rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/50`}
      whileTap={{ scale: 0.92 }}
    >
      {active && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(79,70,229,0.15)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: active ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "linear-gradient(135deg,rgba(79,70,229,0.25),rgba(99,102,241,0.15))",
          border: "2px solid rgba(79,70,229,0.4)",
          boxShadow: active ? "0 0 40px rgba(79,70,229,0.5)" : "0 0 20px rgba(79,70,229,0.2)",
        }}
      >
        {active ? <MicOff size={iconSize[size]} color="#fff" /> : <Mic size={iconSize[size]} color="#fff" />}
      </div>
    </motion.button>
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
  const [state, setState] = useState<VoiceState>("greeting");
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [intent, setIntent] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const greetingPlayed = useRef(false);

  const playTts = useCallback(async (text: string) => {
    try {
      const blob = await api.speak(text);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => {});
    } catch {
      // TTS error — non-critical
    }
  }, []);

  // ── GREETING ON MOUNT ──────────────────────────────────────────

  useEffect(() => {
    if (greetingPlayed.current) return;
    greetingPlayed.current = true;

    const greeting = generateGreeting();
    setConversation([{ role: "assistant", text: greeting }]);
    // Small delay so the UI renders before TTS plays
    const t = setTimeout(() => playTts(greeting), 400);
    const t2 = setTimeout(() => setState("idle"), 1200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [playTts]);

  // Auto-scroll chat to the latest message
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [conversation]);

  // ── VOICE COMMAND HANDLING ─────────────────────────────────────

  const handleVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message to conversation
    setConversation(prev => [...prev, { role: "user", text }]);
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

      // Add assistant response to conversation
      const assistantMsg: ChatMessage = {
        role: "assistant",
        text: result.response_text,
        parameters: result.parameters,
        intent: result.intent,
      };
      setConversation(prev => [...prev, assistantMsg]);

      // Play TTS response
      playTts(result.response_text);

      // If it's a search result with offers, navigate to results
      if (
        (result.intent === "search_flights" || result.intent === "search_with_budget") &&
        result.parameters?.offers?.length > 0
      ) {
        setState("result");
        return;
      }

      // If all booking params are ready, show continue button
      if (
        result.intent === "book_flight" &&
        result.parameters?.booking_id
      ) {
        setState("result");
        return;
      }

      // Otherwise — conversational: prompt user to speak again
      // Wait for TTS to finish, then auto-prompt
      setState("result");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setState("idle");
    }
  }, [playTts]);

  // ── START LISTENING ────────────────────────────────────────────

  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Your browser doesn't support speech recognition. Please type your command below.");
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
        setState(prev => prev === "listening" ? "idle" : prev);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setState("listening");
      setError("");
    } catch (err) {
      setState("idle");
      setError("Microphone access denied. Allow mic in your browser settings, or type your command below.");
    }
  }, [handleVoiceCommand]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const handleSubmitText = () => {
    if (inputText.trim()) {
      handleVoiceCommand(inputText);
      setInputText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmitText();
  };

  const handleReset = () => {
    setState("idle");
    setTranscript("");
    setConversation([]);
    setParameters({});
    setIntent("");
    setError("");
    greetingPlayed.current = false;
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
        <h1 className="text-lg font-bold text-white">Wayfinder Assistant</h1>
      </div>

      <div className="flex-1 px-5 space-y-4 pb-8 flex flex-col">
        {/* ── CHAT CONVERSATION ────────────────────────────── */}
        <div
          ref={chatRef}
          className="flex-1 space-y-3 overflow-y-auto scroll-smooth pr-1"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          {conversation.length === 0 && state === "greeting" && (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} color="#4F46E5" className="animate-spin" />
            </div>
          )}

          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
              {msg.role === "assistant" ? (
                <div
                  className="max-w-[85%] rounded-2xl px-5 py-4 text-left"
                  style={{
                    background: "rgba(79,70,229,0.1)",
                    border: "1px solid rgba(79,70,229,0.15)",
                    borderBottomLeftRadius: i === conversation.length - 1 ? 4 : undefined,
                  }}
                >
                  <p className="text-sm font-semibold text-indigo-300 mb-1">
                    {i === 0 ? "✈️ Wayfinder" : "Wayfinder"}
                  </p>
                  <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">{msg.text}</p>

                  {/* Show detected parameters as tags */}
                  {msg.parameters && Object.keys(msg.parameters).filter(k => !["session_id","offers","user_lang","missing","unknown_intent","error"].includes(k) && msg.parameters?.[k]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(msg.parameters).map(([key, val]) => {
                        if (!val || ["session_id","offers","user_lang","missing","unknown_intent","error"].includes(key)) return null;
                        return (
                          <span key={key}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ background: "rgba(79,70,229,0.15)", color: "#A5B4FC", border: "1px solid rgba(79,70,229,0.2)" }}
                          >
                            {key.replace(/_/g, " ")}: {String(val)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-3 text-left"
                  style={{
                    background: "rgba(99,102,241,0.2)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    borderBottomRightRadius: 4,
                  }}
                >
                  <p className="text-sm text-white/85">{msg.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── LISTENING INDICATOR ──────────────────────────── */}
        {state === "listening" && (
          <div
            className="flex items-center justify-center gap-3 py-3 rounded-xl"
            style={{ background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.15)" }}
          >
            <VoiceWave active={true} size="sm" />
            <p className="text-sm font-medium text-[#4F46E5]">Listening...</p>
            <p className="text-xs text-[#64748B]">Tap mic to stop</p>
          </div>
        )}

        {state === "processing" && (
          <div
            className="flex items-center justify-center gap-3 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Loader2 size={18} color="#4F46E5" className="animate-spin" />
            <p className="text-sm font-medium text-white/70">Thinking...</p>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={handleReset} className="text-xs font-medium text-white mt-2 underline focus:outline-none">
              Try Again
            </button>
          </div>
        )}

        {/* ── MIC BAR ─────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "rgba(21,28,47,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Mic button */}
          <motion.button
            onClick={state === "listening" ? stopRecording : startRecording}
            disabled={state === "processing"}
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:opacity-40 ${state === "listening" ? "bg-gradient-to-br from-[#4F46E5] to-[#6366f1]" : "bg-white/10"}`}
            whileTap={{ scale: 0.9 }}
          >
            {state === "listening" ? (
              <MicOff size={22} color="#fff" />
            ) : (
              <Mic size={22} color={state === "processing" ? "#64748B" : "#fff"} />
            )}
          </motion.button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={state === "listening" ? "Speak now..." : "Type a message..."}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] focus:outline-none"
          />

          {/* Send button */}
          <button
            onClick={handleSubmitText}
            disabled={!inputText.trim() || state === "processing"}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            style={{ background: inputText.trim() ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "transparent" }}
          >
            <ChevronRight size={18} color="#fff" />
          </button>

          {/* Action button when ready to navigate */}
          {state === "result" && intent === "search_flights" && parameters?.offers?.length > 0 && (
            <button
              onClick={() => onNavigate("results", { parameters, intent })}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#22C55E,#16A34A)" }}
            >
              Results →
            </button>
          )}
        </div>

        {/* Re-prompt hint after assistant responds */}
        {state === "result" && !(intent === "search_flights" && parameters?.offers?.length > 0) && (
          <p className="text-xs text-center text-[#64748B] -mt-2">
            Tap the mic or type your reply to continue
          </p>
        )}
      </div>
    </div>
  );
}