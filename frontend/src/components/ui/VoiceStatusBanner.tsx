/**
 * VoiceStatusBanner — large accessible status banner for current voice state.
 * Used at the top of voice-heavy screens.
 */
import { Mic, Loader2, Volume2, CheckCircle2, AlertCircle, Hand } from "lucide-react";
import { MicState } from "./VoiceMicButton";

interface VoiceStatusBannerProps {
  state: MicState;
  transcript?: string;
  responseText?: string;
}

const CONFIG: Record<
  MicState,
  { icon: typeof Mic; label: string; sub: string; color: string; bg: string }
> = {
  idle: {
    icon: Hand,
    label: "Ready",
    sub: "Tap the microphone to begin",
    color: "text-indigo-200",
    bg: "bg-indigo-500/10 border-indigo-400/20",
  },
  listening: {
    icon: Mic,
    label: "Listening",
    sub: "Speak naturally — I'm listening",
    color: "text-red-200",
    bg: "bg-red-500/12 border-red-400/30",
  },
  processing: {
    icon: Loader2,
    label: "Thinking",
    sub: "Finding the best options for you",
    color: "text-indigo-200",
    bg: "bg-indigo-500/12 border-indigo-400/30",
  },
  speaking: {
    icon: Volume2,
    label: "Speaking",
    sub: "Reading the response aloud",
    color: "text-emerald-200",
    bg: "bg-emerald-500/12 border-emerald-400/30",
  },
  success: {
    icon: CheckCircle2,
    label: "Done",
    sub: "All set",
    color: "text-emerald-200",
    bg: "bg-emerald-500/12 border-emerald-400/30",
  },
  error: {
    icon: AlertCircle,
    label: "Something went wrong",
    sub: "Please try again",
    color: "text-red-200",
    bg: "bg-red-500/12 border-red-400/30",
  },
};

export function VoiceStatusBanner({ state, transcript, responseText }: VoiceStatusBannerProps) {
  const cfg = CONFIG[state];
  const Icon = cfg.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`w-full rounded-2xl border p-4 ${cfg.bg}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center bg-black/30 ${cfg.color}`}
          aria-hidden="true"
        >
          <Icon
            size={24}
            className={state === "processing" ? "animate-spin" : ""}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-bold ${cfg.color}`}>{cfg.label}</p>
          {transcript ? (
            <p className="text-base text-white mt-1 truncate">"{transcript}"</p>
          ) : (
            <p className="text-sm text-slate-300 mt-0.5">{cfg.sub}</p>
          )}
        </div>
      </div>
      {responseText && state === "speaking" && (
        <p className="mt-3 text-base text-white/90 leading-relaxed">{responseText}</p>
      )}
    </div>
  );
}
