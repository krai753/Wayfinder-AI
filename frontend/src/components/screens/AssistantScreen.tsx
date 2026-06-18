/**
 * AssistantScreen — always-available AI chat fallback.
 *
 * - Send a message, get a structured response
 * - Same backend /api/voice/command
 * - Quick-action chips for common intents
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Volume2,
  VolumeX,
  Plane,
  Bookmark,
  X,
  Mic,
  BarChart3,
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { useWizard } from "../../hooks/useWizard";
import { api } from "../../services/api";
import { useSpeech, speak, stopSpeaking } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { NavFn } from "../../types";

interface AssistantScreenProps {
  navigate: NavFn;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  intent?: string;
  params?: Record<string, any>;
  speaking?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Book a flight", icon: <Plane size={18} />, text: "Book a flight" },
  { label: "Show my trips", icon: <Bookmark size={18} />, text: "Show my trips" },
  { label: "Cancel latest booking", icon: <X size={18} />, text: "Cancel my latest booking" },
  { label: "Travel stats", icon: <BarChart3 size={18} />, text: "Show my travel stats" },
];

export function AssistantScreen({ navigate }: AssistantScreenProps) {
  const { profile } = useUser();
  const { startSession } = useWizard();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setInput((prev) => (prev + " " + text).trim());
        setListening(false);
      }
    },
    onError: () => setListening(false),
  });

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: `Hi ${profile.name.split(" ")[0]}! I'm your travel assistant. I can book flights, cancel bookings, or show your travel stats. What would you like to do?`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    const userMsg: Message = { role: "user", text: cleaned };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const sid = await startSession();
      const res = await api.voiceCommand(cleaned, sid);
      const asstMsg: Message = {
        role: "assistant",
        text: res.response_text,
        intent: res.intent,
        params: res.parameters,
      };
      setMessages((m) => [...m, asstMsg]);
      const newIdx = messages.length + 1; // userMsg + asstMsg
      setSpeakingIdx(newIdx);
      speak({
        text: res.response_text,
        onEnd: () => setSpeakingIdx(null),
      });
      // Auto-route after a beat
      setTimeout(() => {
        handleAutoRoute(res.intent, res.parameters || {});
      }, 1500);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Sorry, something went wrong. ${e?.message || "Please try again."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleAutoRoute(intent: string, p: Record<string, any>) {
    if (intent === "search_flights" || intent === "search_with_budget") {
      navigate("results", { origin: p.origin, destination: p.destination, date: p.date });
    } else if (intent === "view_history") {
      navigate("bookings");
    } else if (intent === "view_portfolio") {
      navigate("portfolio");
    }
  }

  function toggleMic() {
    if (listening) {
      speech.stopListening();
      setListening(false);
    } else {
      setListening(true);
      speech.startListening();
    }
  }

  function toggleSpeak(idx: number, text: string) {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
    } else {
      setSpeakingIdx(idx);
      speak({ text, onEnd: () => setSpeakingIdx(null) });
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1020" }}>
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
          <div
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
            aria-hidden="true"
          >
            <Sparkles size={26} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">AI Assistant</h1>
            <p className="text-sm text-slate-400">Always here to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-4 pb-4 space-y-3"
        style={{ minHeight: 0 }}
      >
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[88%] rounded-2xl p-4
                ${
                  m.role === "user"
                    ? "bg-indigo-500/30 border border-indigo-400/30"
                    : "bg-white/5 border border-white/10"
                }
              `}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
                    aria-hidden="true"
                  >
                    <Sparkles size={14} color="#fff" />
                  </div>
                  <p className="text-xs uppercase tracking-widest font-bold text-indigo-300">
                    Wayfinder
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleSpeak(i, m.text)}
                    aria-label={speakingIdx === i ? "Stop reading" : "Read aloud"}
                    className="ml-auto w-8 h-8 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
                  >
                    {speakingIdx === i ? (
                      <VolumeX size={14} color="#A5B4FC" aria-hidden="true" />
                    ) : (
                      <Volume2 size={14} color="#A5B4FC" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
              <p
                className={`text-base leading-relaxed ${
                  m.role === "user" ? "text-white" : "text-white"
                }`}
              >
                {m.text}
              </p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div
                  className="inline-block w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="text-base text-slate-300">Thinking…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => send(a.text)}
                className="
                  min-h-[60px] rounded-2xl p-3
                  flex items-center gap-2
                  bg-white/5 hover:bg-white/10 border border-white/10
                  text-white text-sm font-semibold text-left
                  focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                  active:scale-95 transition-all
                "
                aria-label={a.label}
              >
                <span className="text-indigo-300 shrink-0" aria-hidden="true">
                  {a.icon}
                </span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div
        className="sticky bottom-0 z-10 px-4 pt-3 pb-4"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          background:
            "linear-gradient(0deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.75) 80%, transparent 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop voice input" : "Speak your message"}
            aria-pressed={listening}
            className={`
              shrink-0 w-[60px] h-[60px] rounded-2xl
              flex items-center justify-center
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              active:scale-95 transition-all
              ${
                listening
                  ? "bg-red-500/30 border border-red-400/40"
                  : "bg-indigo-500/20 border border-indigo-400/30"
              }
            `}
          >
            <Mic
              size={26}
              color={listening ? "#FCA5A5" : "#A5B4FC"}
              aria-hidden="true"
            />
          </button>
          <label htmlFor="assistant-input" className="sr-only">
            Type your message
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Type or speak…"
            rows={1}
            className="
              flex-1 max-h-32 min-h-[60px] px-4 py-3
              rounded-2xl
              bg-white/8 border border-white/10
              text-base text-white placeholder:text-slate-500
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              resize-none
            "
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="
              shrink-0 w-[60px] h-[60px] rounded-2xl
              flex items-center justify-center
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              active:scale-95 transition-all
              disabled:opacity-40
            "
            style={{
              background: "linear-gradient(135deg,#4F46E5,#6366f1)",
              boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
            }}
          >
            <Send size={22} color="#fff" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
