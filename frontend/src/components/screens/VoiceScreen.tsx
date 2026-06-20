import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, ArrowLeft, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { api } from "../../services/api";

type VoiceState = "idle" | "listening" | "processing" | "result";

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

function MicButton({ size = "lg", active = false, onClick }: { size?: "sm" | "md" | "lg"; active?: boolean; onClick?: (e?: React.MouseEvent) => void }) {
  const dims: Record<string, string> = { sm: "w-14 h-14", md: "w-20 h-20", lg: "w-28 h-28" };
  const iconSize: Record<string, number> = { sm: 20, md: 28, lg: 44 };
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

export default function VoiceScreen({ onNavigate }: { onNavigate: (screen: string, data?: any) => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [intent, setIntent] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTranscript(text);
    setState("processing");
    setError("");

    try {
      const result = await api.voiceCommand(text);
      setIntent(result.intent);
      setResponseText(result.response_text);
      setParameters(result.parameters || {});
      setState("result");
      playTts(result.response_text);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setState("idle");
    }
  }, [playTts]);

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
    setResponseText("");
    setParameters({});
    setIntent("");
    setError("");
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks on the stream
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) {
          setState("idle");
          return;
        }

        setState("processing");
        try {
          const result = await api.listen(blob);
          if (result.transcript?.trim()) {
            await handleVoiceCommand(result.transcript);
          } else {
            setError("Could not understand audio. Please try typing your command.");
            setState("idle");
          }
        } catch (err: any) {
          setError(err.message || "Speech recognition failed");
          setState("idle");
        }
      };

      recorder.onerror = () => {
        setState("idle");
        setError("Recording error occurred");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("listening");
    } catch (err) {
      setState("idle");
      setError("Microphone access denied. To use voice: open the HTTPS URL below and allow mic permission — or type your command below.");
    }
  }, [handleVoiceCommand]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0B1020" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button
          onClick={() => onNavigate("home")}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft size={20} color="#94A3B8" />
        </button>
        <h1 className="text-lg font-bold text-white">Voice Assistant</h1>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Mic area / main interaction */}
        <GlassCard
          className={`p-8 text-center transition-all duration-300 ${state === "result" ? "pb-6" : "pb-10"}`}
          onClick={state === "idle" ? () => startRecording() : undefined}
        >
          {state === "idle" && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              <MicButton size="lg" active={false} onClick={() => startRecording()} />
              <VoiceWave active={false} size="md" />
              <p className="text-base font-semibold text-white">Tap to Speak</p>
              <p className="text-xs text-[#94A3B8] -mt-2">or type below</p>
            </motion.div>
          )}

          {state === "listening" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5"
            >
              <MicButton size="lg" active={true} onClick={() => stopRecording()} />
              <VoiceWave active={true} size="md" />
              <p className="text-base font-semibold text-[#4F46E5]">Listening...</p>
              <p className="text-xs text-[#94A3B8] -mt-2">Tap mic to stop</p>
            </motion.div>
          )}

          {state === "processing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5"
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.25),rgba(99,102,241,0.15))", border: "2px solid rgba(79,70,229,0.4)" }}
              >
                <Loader2 size={44} color="#4F46E5" className="animate-spin" />
              </div>
              <p className="text-base font-semibold text-white">Thinking...</p>
              {transcript && (
                <p className="text-sm text-[#94A3B8] italic">"{transcript}"</p>
              )}
            </motion.div>
          )}

          {state === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1))", border: "2px solid rgba(34,197,94,0.3)" }}
              >
                <Sparkles size={28} color="#22C55E" />
              </div>
              <p className="text-sm text-[#94A3B8]">You said:</p>
              <p className="text-base font-semibold text-white/90 italic mb-1">"{transcript}"</p>

              <div
                className="w-full rounded-xl p-4 text-left"
                style={{ background: "rgba(79,70,229,0.1)", border: "1px solid rgba(79,70,229,0.2)" }}
              >
                <p className="text-sm leading-relaxed text-white/90">{responseText}</p>
              </div>

              {/* Parameters section */}
              {Object.keys(parameters).length > 0 && (
                <div className="w-full mt-1">
                  <p className="text-xs font-medium text-[#94A3B8] mb-2 uppercase tracking-wider">Detected Details</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parameters).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                          style={{ background: "rgba(79,70,229,0.12)", color: "#A5B4FC", border: "1px solid rgba(79,70,229,0.2)" }}
                        >
                          {key.replace(/_/g, " ")}: {String(val)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action button based on intent */}
              <div className="w-full flex flex-col gap-2 mt-2">
                {(intent === "search_flights" || intent === "book_flight") && parameters.origin && parameters.destination && (
                  <PrimaryButton
                    onClick={() => onNavigate("results", { parameters, intent })}
                    icon={<ChevronRight size={18} />}
                    className="w-full"
                  >
                    Show Flight Results
                  </PrimaryButton>
                )}
                <button
                  onClick={handleReset}
                  className="text-sm font-medium text-[#94A3B8] py-2 hover:text-white transition-colors focus:outline-none"
                >
                  Start Over
                </button>
              </div>
            </motion.div>
          )}
        </GlassCard>

        {/* Error display */}
        {error && (
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={handleReset} className="text-xs font-medium text-white mt-2 underline focus:outline-none">
              Try Again
            </button>
          </div>
        )}

        {/* Text input for typing (accessibility fallback) */}
        {state !== "processing" && (
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command... (e.g. 'book a flight from LHR to JFK')"
              className="flex-1 rounded-2xl px-5 py-4 text-sm text-white placeholder-[#64748B] border border-white/8 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
              style={{ background: "rgba(21,28,47,0.7)" }}
            />
            <button
              onClick={handleSubmitText}
              disabled={!inputText.trim()}
              className="w-14 h-14 rounded-2xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              style={{ background: inputText.trim() ? "linear-gradient(135deg,#4F46E5,#6366f1)" : "#2D3B55" }}
            >
              <ChevronRight size={22} color="#fff" />
            </button>
          </div>
        )}

        {/* Suggestions */}
        {state === "idle" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider px-1">Try saying</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Book a flight from LHR to JFK",
                "I want to fly from London to New York",
                "Search flights from JFK to LAX",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputText(suggestion);
                    handleVoiceCommand(suggestion);
                  }}
                  className="text-xs rounded-full px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  style={{ background: "rgba(79,70,229,0.1)", color: "#A5B4FC", border: "1px solid rgba(79,70,229,0.2)" }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
