/**
 * AirportInput — used for both origin and destination selection.
 *
 * Behaviour:
 * - Large search field, auto-focused on mount
 * - Fuzzy search via /api/airports?q=...
 * - Tap a result to select (or use Voice: "Select the first one")
 * - Recent airports remembered in localStorage
 * - Popular airports shown when query is empty
 * - Voice fallback: "Set [city] airport" parses the result
 * - Swaps origin/destination via a center icon (when used as origin)
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, X, Volume2, ArrowLeftRight, ArrowLeft, Mic } from "lucide-react";
import { api } from "../../services/api";
import { useWizard } from "../../hooks/useWizard";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { NavFn } from "../../types";
import type { AirportResult } from "../../types";

const RECENT_KEY = "wayfinder.recentAirports";
const POPULAR_IATAS = ["LHR", "JFK", "CDG", "DXB", "SIN", "NRT", "FRA", "AMS", "IST", "LAX", "SFO"];

interface AirportInputProps {
  navigate: NavFn;
  /** Which field are we editing? */
  field: "origin" | "destination";
}

export function AirportInput({ navigate, field }: AirportInputProps) {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    swapOriginDestination,
  } = useWizard();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AirportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<AirportResult[]>([]);
  const [popular, setPopular] = useState<AirportResult[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = field === "origin" ? origin : destination;
  const title = field === "origin" ? "Where are you flying from?" : "Where do you want to go?";
  const subtitle = field === "origin" ? "Origin airport" : "Destination airport";

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load recents + popular on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw).slice(0, 5));
    } catch {}
    // Fetch popular airports (LHR, JFK, etc.)
    (async () => {
      const list: AirportResult[] = [];
      for (const iata of POPULAR_IATAS.slice(0, 6)) {
        try {
          const a = await api.getAirport(iata);
          if (a) list.push(a);
        } catch {}
      }
      setPopular(list);
    })();
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.searchAirports(query.trim());
        if (!cancelled) setResults(res.airports || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function saveRecent(a: AirportResult) {
    try {
      const existing: AirportResult[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      const filtered = existing.filter((r) => r.iata !== a.iata);
      const next = [a, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecents(next);
    } catch {}
  }

  function handleSelect(a: AirportResult) {
    saveRecent(a);
    speak({ text: `${a.city} ${a.name}, code ${a.iata}, selected.` });
    if (field === "origin") {
      setOrigin(a);
      // If a destination already exists, go to date picker; else pick destination
      if (destination) navigate("dates");
      else navigate("destination");
    } else {
      setDestination(a);
      navigate("dates");
    }
  }

  function handleVoice(text: string) {
    setQuery(text);
    setVoiceOpen(false);
  }

  // Back navigation
  const back = () => {
    if (field === "destination" && origin) navigate("origin");
    else navigate("home");
  };

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
            onClick={back}
            aria-label="Back"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12
              border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            "
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          {field === "origin" && origin && destination && (
            <button
              type="button"
              onClick={swapOriginDestination}
              aria-label="Swap origin and destination"
              className="
                w-[60px] h-[60px] rounded-full shrink-0
                flex items-center justify-center
                bg-indigo-500/20 hover:bg-indigo-500/30
                border border-indigo-400/30
                focus:outline-none focus:ring-4 focus:ring-indigo-400/70
              "
            >
              <ArrowLeftRight size={24} color="#A5B4FC" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 pt-4">
        <div className="relative">
          <Search
            size={22}
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="airport-search" className="sr-only">
            Search for an airport
          </label>
          <input
            id="airport-search"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, airport, or IATA code"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="
              w-full h-[64px] pl-14 pr-14
              rounded-2xl
              bg-white/8 border border-white/10
              text-lg text-white placeholder:text-slate-500
              focus:outline-none focus:ring-4 focus:ring-indigo-400/60 focus:border-indigo-400/60
            "
            aria-describedby="airport-search-hint"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                w-[44px] h-[44px] rounded-full
                flex items-center justify-center
                bg-white/8 hover:bg-white/12
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              "
            >
              <X size={20} color="#fff" />
            </button>
          )}
        </div>
        <p id="airport-search-hint" className="text-sm text-slate-400 mt-2">
          Or tap the microphone to speak your airport
        </p>
      </div>

      {/* Voice input (collapsible) */}
      <AnimatePresence>
        {voiceOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 mt-3 overflow-hidden"
          >
            <VoiceInputInline
              onResult={handleVoice}
              onClose={() => setVoiceOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice button + read-aloud */}
      <div className="px-5 mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setVoiceOpen((v) => !v)}
          aria-label={voiceOpen ? "Close voice input" : "Search by voice"}
          aria-expanded={voiceOpen}
          className="
            flex-1 h-[60px] rounded-2xl
            flex items-center justify-center gap-3
            bg-indigo-500/20 hover:bg-indigo-500/30
            border border-indigo-400/30
            text-white font-semibold text-base
            focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            active:scale-[0.98] transition-all
          "
        >
          <Mic size={22} aria-hidden="true" />
          <span>{voiceOpen ? "Close voice" : "Search by voice"}</span>
        </button>
      </div>

      {/* Content area: recents / popular / results */}
      <div className="px-5 mt-6 space-y-6">
        {/* Current selection display */}
        {currentValue && !query && (
          <GlassCard className="p-4" ariaLabel={`Currently selected ${field}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)" }}
                aria-hidden="true"
              >
                <MapPin size={22} className="text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest font-bold text-emerald-300">
                  Currently selected
                </p>
                <p className="text-lg font-bold text-white truncate">
                  {currentValue.city} ({currentValue.iata})
                </p>
                <p className="text-sm text-slate-400 truncate">
                  {currentValue.name} • {currentValue.country}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Search results */}
        {query && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {loading ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </h2>
            <div className="space-y-2">
              {results.length === 0 && !loading && (
                <p className="text-base text-slate-400 py-8 text-center">
                  No airports found. Try a different search.
                </p>
              )}
              {results.map((a) => (
                <AirportCard
                  key={a.iata}
                  airport={a}
                  onSelect={() => handleSelect(a)}
                  onSpeak={() =>
                    speak({ text: `${a.city}, ${a.name}. Code ${a.iata}.` })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Recents */}
        {!query && recents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recent
            </h2>
            <div className="space-y-2">
              {recents.map((a) => (
                <AirportCard
                  key={`recent-${a.iata}`}
                  airport={a}
                  onSelect={() => handleSelect(a)}
                  onSpeak={() =>
                    speak({ text: `Recent: ${a.city}, ${a.iata}` })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Popular */}
        {!query && popular.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Popular destinations
            </h2>
            <div className="space-y-2">
              {popular.map((a) => (
                <AirportCard
                  key={`popular-${a.iata}`}
                  airport={a}
                  onSelect={() => handleSelect(a)}
                  onSpeak={() =>
                    speak({ text: `${a.city}, ${a.name}, code ${a.iata}` })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AirportCardProps {
  airport: AirportResult;
  onSelect: () => void;
  onSpeak: () => void;
}

function AirportCard({ airport, onSelect, onSpeak }: AirportCardProps) {
  return (
    <GlassCard
      className="p-4"
      onClick={onSelect}
      ariaLabel={`Select ${airport.city}, ${airport.name}, code ${airport.iata}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
          aria-hidden="true"
        >
          {airport.iata.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white truncate">
            {airport.city} <span className="text-slate-400 font-normal">({airport.iata})</span>
          </p>
          <p className="text-sm text-slate-400 truncate">
            {airport.name} • {airport.country}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSpeak();
          }}
          aria-label={`Read out ${airport.city} ${airport.iata}`}
          className="
            w-[60px] h-[60px] rounded-full shrink-0
            flex items-center justify-center
            bg-white/8 hover:bg-white/12
            border border-white/10
            focus:outline-none focus:ring-4 focus:ring-indigo-400/60
          "
        >
          <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  );
}

function VoiceInputInline({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "listening" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const speech = useSpeech({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setTranscript(text);
        onResult(text);
      }
    },
    onError: (e) => {
      setStatus("error");
      setError(e);
    },
  });

  function toggle() {
    if (status === "listening") {
      speech.stopListening();
      setStatus("idle");
    } else {
      setStatus("listening");
      setTranscript("");
      speech.startListening();
    }
  }

  return (
    <GlassCard className="p-4" ariaLabel="Voice search input">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={status === "listening" ? "Stop voice input" : "Start voice input"}
          aria-pressed={status === "listening"}
          className={`
            shrink-0 w-[60px] h-[60px] rounded-full
            flex items-center justify-center
            focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            transition-all active:scale-95
            ${
              status === "listening"
                ? "bg-red-500/30 border border-red-400/40"
                : "bg-indigo-500/30 border border-indigo-400/40"
            }
          `}
        >
          <Mic size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 font-semibold">
            {status === "listening" ? "Listening…" : "Tap to speak"}
          </p>
          <p className="text-sm text-slate-400 truncate">
            {transcript || (error ? `Error: ${error}` : 'e.g. "London Heathrow"')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close voice input"
          className="
            shrink-0 w-[44px] h-[44px] rounded-full
            flex items-center justify-center
            bg-white/8 hover:bg-white/12
            focus:outline-none focus:ring-4 focus:ring-indigo-400/60
          "
        >
          <X size={20} color="#fff" />
        </button>
      </div>
    </GlassCard>
  );
}
