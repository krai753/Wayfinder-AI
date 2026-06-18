/**
 * useSpeech — Web Speech API wrapper for browser-side STT + TTS.
 *
 * - TTS: speaks any text using SpeechSynthesis (with cancel())
 * - STT: continuous recognition with interim transcript
 * - Gracefully degrades if browser lacks support
 * - Reads user setting (voice, rate, pitch) from localStorage
 */
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SpeechStatus = "idle" | "starting" | "listening" | "stopping" | "error" | "unsupported";

export interface UseSpeechOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface UseSpeechReturn {
  status: SpeechStatus;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
  isSupported: boolean;
  error: string | null;
}

// ── TTS Settings (per user profile) ────────────────────────────────

export interface TtsSettings {
  voiceURI: string | null;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0 - 2
  volume: number; // 0 - 1
}

const DEFAULT_TTS: TtsSettings = {
  voiceURI: null,
  rate: 0.95,
  pitch: 1.0,
  volume: 1.0,
};

const TTS_KEY = "wayfinder.tts.settings";

export function loadTtsSettings(): TtsSettings {
  try {
    const raw = localStorage.getItem(TTS_KEY);
    if (!raw) return DEFAULT_TTS;
    return { ...DEFAULT_TTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TTS;
  }
}

export function saveTtsSettings(s: TtsSettings) {
  try {
    localStorage.setItem(TTS_KEY, JSON.stringify(s));
  } catch {}
}

// ── useSpeech hook ─────────────────────────────────────────────────

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    onResult,
    onError,
    lang = "en-US",
    continuous = false,
    interimResults = true,
  } = options;

  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isSupported = typeof window !== "undefined" &&
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser. Please type your command instead.");
      onError?.("unsupported");
      return;
    }
    if (status === "listening" || status === "starting") return;

    try {
      setStatus("starting");
      setError(null);
      setTranscript("");
      setInterimTranscript("");

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setStatus("listening");
      recognition.onaudiostart = () => setStatus("listening");
      recognition.onspeechstart = () => setStatus("listening");
      recognition.onspeechend = () => setStatus("stopping");
      recognition.onend = () => setStatus("idle");

      recognition.onerror = (e: any) => {
        const errMsg = e?.error || "speech_error";
        setError(errMsg);
        setStatus("error");
        onError?.(errMsg);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }
        if (finalChunk) {
          setTranscript((prev) => (prev + " " + finalChunk).trim());
          onResult?.(finalChunk, true);
        }
        setInterimTranscript(interimChunk);
        if (interimChunk) onResult?.(interimChunk, false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setError(e?.message ?? "start_failed");
      setStatus("error");
      onError?.(e?.message ?? "start_failed");
    }
  }, [isSupported, status, continuous, interimResults, lang, onResult, onError]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setStatus("stopping");
  }, []);

  const reset = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {}
    setStatus("idle");
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
    };
  }, []);

  return { status, transcript, interimTranscript, startListening, stopListening, reset, isSupported, error };
}

// ── TTS (speak) helpers ────────────────────────────────────────────

let cachedVoices: SpeechSynthesisVoice[] | null = null;

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (cachedVoices) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  // Some browsers load voices asynchronously
  if (cachedVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
  return cachedVoices;
}

export interface SpeakOptions {
  text: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string | null;
  onEnd?: () => void;
  onStart?: () => void;
}

export function speak({ text, rate, pitch, volume, voiceURI, onStart, onEnd }: SpeakOptions) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return false;
  try {
    window.speechSynthesis.cancel(); // Stop any in-progress speech
    const utter = new SpeechSynthesisUtterance(text);
    const settings = loadTtsSettings();
    utter.rate = rate ?? settings.rate;
    utter.pitch = pitch ?? settings.pitch;
    utter.volume = volume ?? settings.volume;
    utter.lang = "en-US";
    if (voiceURI ?? settings.voiceURI) {
      const v = getVoices().find((v) => v.voiceURI === (voiceURI ?? settings.voiceURI));
      if (v) utter.voice = v;
    } else {
      // Prefer an English voice
      const v = getVoices().find((v) => v.lang.startsWith("en")) ?? getVoices()[0];
      if (v) utter.voice = v;
    }
    if (onStart) utter.onstart = onStart;
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis?.speaking ?? false;
}
