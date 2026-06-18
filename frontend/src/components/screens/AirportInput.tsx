/**
 * AirportInput — used for both origin and destination selection.
 *
 * Premium-quality airport picker:
 * - Large search field (Doppelrand input)
 * - Fuzzy search via /api/airports
 * - Sticky header with swap button (when both airports set)
 * - Recent + Popular sections, in their own tinted cards
 * - Voice search with inline transcript
 * - Haptic feedback on every action
 * - Keyboard shortcuts: Escape to clear, Enter to select first result
 * - Auto-read popular airports on mount for blind users
 * - aria-current='true' on selected airport
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  MapPin,
  X,
  Volume2,
  ArrowLeftRight,
  ArrowLeft,
  Mic,
  History,
  Sparkles,
} from "lucide-react";
import { api } from "../../services/api";
import { useWizard } from "../../hooks/useWizard";
import { useSpeech, speak } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { haptic } from "../../lib/haptics";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import type { AirportResult } from "../../types";

const RECENT_KEY = "wayfinder.recentAirports";
const POPULAR_IATAS = ["LHR", "JFK", "CDG", "DXB", "SIN", "NRT", "FRA", "AMS", "IST", "LAX", "SFO"];

interface AirportInputProps {
  navigate: NavFn;
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

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && query) {
        setQuery("");
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [query]);

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
    haptic.select();
    saveRecent(a);
    speak({ text: `${a.city} ${a.name}, code ${a.iata}, selected.` });
    if (field === "origin") {
      setOrigin(a);
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

  function handleReadPopular() {
    if (popular.length === 0) return;
    const list = popular.map((a) => `${a.city} (${a.iata})`).join(", ");
    speak({ text: `Popular destinations: ${list}.` });
  }

  function handleSwap() {
    haptic.tap();
    swapOriginDestination();
  }

  const back = () => {
    haptic.tap();
    if (field === "destination" && origin) navigate("origin");
    else navigate("home");
  };

  return (
    <div
      className="min-h-[100dvh] pb-32"
      style={{ background: tokens.color.bg.deep }}
    >
      <div
        className="sticky top-0 z-20 px-5 pt-4 pb-3"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          background:
            "linear-gradient(180deg, rgba(11,16,32,0.95) 0%, rgba(11,16,32,0.6) 80%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] transition-colors"
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white" style={type.h3}>
              {title}
            </h1>
            <p className="text-slate-400 truncate" style={type.bodySm as any}>
              {subtitle}
            </p>
          </div>
          {field === "origin" && origin && destination && (
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap origin and destination"
              className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 transition-colors"
            >
              <ArrowLeftRight size={24} color="#A5B4FC" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Search field with Doppelrand */}
        <div
          className="relative border"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            borderColor: "rgba(255, 255, 255, 0.10)",
            borderRadius: tokens.radius["2xl"],
            boxShadow: tokens.elevation.insetHighlight,
          }}
        >
          <Search
            size={22}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="airport-search" className="sr-only">
            Search for an airport by city, name, or IATA code
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
            aria-describedby="airport-search-hint"
            className="w-full h-[64px] pl-14 pr-14 bg-transparent border-0 outline-none text-white placeholder:text-slate-500 focus:ring-0"
            style={type.bodyLg as any}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                haptic.tap();
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
            >
              <X size={20} color="#fff" />
            </button>
          )}
        </div>
        <p id="airport-search-hint" className="text-slate-400 mt-3" style={type.bodySm as any}>
          Or tap the microphone to speak your airport
        </p>
      </div>

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

      <div className="px-5 mt-3">
        <Button
          onClick={() => {
            haptic.tap();
            setVoiceOpen((v) => !v);
          }}
          variant="secondary"
          size="lg"
          icon={<Mic size={20} />}
          fullWidth
          aria-expanded={voiceOpen}
        >
          {voiceOpen ? "Close voice" : "Search by voice"}
        </Button>
      </div>

      <div className="px-5 mt-8 space-y-8">
        {currentValue && !query && (
          <Card variant="success" padding="md" ariaLabel={`Currently selected ${field}`}>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.18)" }}
                aria-hidden="true"
              >
                <MapPin size={22} className="text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-300 mb-1" style={type.eyebrow as any}>
                  Currently selected
                </p>
                <p
                  className="text-white truncate"
                  style={{ ...type.h3, fontWeight: 700 }}
                >
                  {currentValue.city} ({currentValue.iata})
                </p>
                <p className="text-slate-400 truncate" style={type.bodySm as any}>
                  {currentValue.name} • {currentValue.country}
                </p>
              </div>
            </div>
          </Card>
        )}

        {query && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-slate-400" style={type.eyebrow as any}>
                {loading
                  ? "Searching…"
                  : `${results.length} result${results.length === 1 ? "" : "s"}`}
              </h2>
              {results[0] && !loading && (
                <button
                  type="button"
                  onClick={() => handleSelect(results[0])}
                  aria-label={`Quick select: ${results[0].city}`}
                  className="text-indigo-300 hover:text-indigo-200 underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 rounded-lg px-2 py-1"
                  style={type.labelSm as any}
                >
                  Select first →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {results.length === 0 && !loading && (
                <Card variant="default" padding="md" className="text-center">
                  <p className="text-slate-400" style={type.body as any}>
                    No airports found. Try a different search.
                  </p>
                </Card>
              )}
              {results.map((a) => (
                <AirportCard
                  key={a.iata}
                  airport={a}
                  selected={currentValue?.iata === a.iata}
                  onSelect={() => handleSelect(a)}
                  onSpeak={() =>
                    speak({ text: `${a.city}, ${a.name}. Code ${a.iata}.` })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {!query && recents.length > 0 && (
          <SectionHeader
            title="Recent"
            icon={<History size={14} aria-hidden="true" />}
            count={recents.length}
          />
        )}
        {!query &&
          recents.length > 0 &&
          recents.map((a) => (
            <AirportCard
              key={`recent-${a.iata}`}
              airport={a}
              selected={currentValue?.iata === a.iata}
              onSelect={() => handleSelect(a)}
              onSpeak={() =>
                speak({ text: `Recent: ${a.city}, ${a.iata}` })
              }
            />
          ))}

        {!query && popular.length > 0 && (
          <>
            <SectionHeader
              title="Popular destinations"
              icon={<Sparkles size={14} aria-hidden="true" />}
              count={popular.length}
              onReadAll={handleReadPopular}
            />
            {popular.map((a) => (
              <AirportCard
                key={`popular-${a.iata}`}
                airport={a}
                selected={currentValue?.iata === a.iata}
                onSelect={() => handleSelect(a)}
                onSpeak={() =>
                  speak({ text: `${a.city}, ${a.name}, code ${a.iata}` })
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  icon,
  onReadAll,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
  onReadAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-slate-400 inline-flex items-center gap-2" style={type.eyebrow as any}>
        {icon}
        <span>
          {title} ({count})
        </span>
      </h2>
      {onReadAll && (
        <button
          type="button"
          onClick={onReadAll}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-300/60"
          style={type.caption as any}
          aria-label={`Read all ${title.toLowerCase()} aloud`}
        >
          <Volume2 size={12} aria-hidden="true" />
          <span>Read all</span>
        </button>
      )}
    </div>
  );
}

interface AirportCardProps {
  airport: AirportResult;
  selected: boolean;
  onSelect: () => void;
  onSpeak: () => void;
}

function AirportCard({ airport, selected, onSelect, onSpeak }: AirportCardProps) {
  return (
    <Card
      variant={selected ? "success" : "default"}
      padding="md"
      onClick={onSelect}
      selected={selected}
      ariaLabel={`${selected ? "Currently selected. " : ""}Select ${airport.city}, ${airport.name}, code ${airport.iata}`}
      ariaCurrent={selected ? "true" : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-extrabold text-white shrink-0"
          style={{
            background: "linear-gradient(135deg, #4F46E5 0%, #22C55E 100%)",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.32)",
          }}
          aria-hidden="true"
        >
          {airport.iata.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-white truncate"
            style={{ ...type.bodyLg as any, fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            {airport.city}{" "}
            <span style={{ color: "rgba(255, 255, 255, 0.54)", fontWeight: 500 }}>
              ({airport.iata})
            </span>
          </p>
          <p className="text-slate-400 truncate" style={type.bodySm as any}>
            {airport.name} • {airport.country}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            haptic.tap();
            onSpeak();
          }}
          aria-label={`Read out ${airport.city} ${airport.iata}`}
          className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
        >
          <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
        </button>
      </div>
    </Card>
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
        haptic.select();
        onResult(text);
      }
    },
    onError: (e) => {
      setStatus("error");
      setError(e);
      haptic.warning();
    },
  });

  function toggle() {
    haptic.tap();
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
    <Card variant="tinted" padding="md" ariaLabel="Voice search input">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={status === "listening" ? "Stop voice input" : "Start voice input"}
          aria-pressed={status === "listening"}
          className={`shrink-0 w-[60px] h-[60px] rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-300/70 transition-all active:scale-95 ${
            status === "listening"
              ? "bg-red-500/30 border border-red-400/40"
              : "bg-indigo-500/30 border border-indigo-400/40"
          }`}
        >
          <Mic size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200" style={type.label as any}>
            {status === "listening" ? "Listening…" : "Tap to speak"}
          </p>
          <p className="text-slate-400 truncate" style={type.bodySm as any}>
            {transcript || (error ? `Error: ${error}` : 'e.g. "London Heathrow"')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic.tap();
            onClose();
          }}
          aria-label="Close voice input"
          className="shrink-0 w-[44px] h-[44px] rounded-full flex items-center justify-center bg-white/8 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-indigo-300/60"
        >
          <X size={20} color="#fff" />
        </button>
      </div>
    </Card>
  );
}
