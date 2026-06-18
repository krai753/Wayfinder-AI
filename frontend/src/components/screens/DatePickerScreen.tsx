/**
 * DatePickerScreen — pick a departure date.
 *
 * Behaviour:
 * - Voice input parses natural language ("next Tuesday", "July 15", "tomorrow")
 * - Quick chips: Today, Tomorrow, This weekend, Next week
 * - Native date input for explicit choice
 * - On confirm, fetches flights
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Calendar, Mic, Send, Volume2, Plane } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";
import { addDaysIso, formatDate, formatDateSpoken, todayIso } from "../../lib/format";

interface DatePickerProps {
  navigate: NavFn;
}

const QUICK_PRESETS: { label: string; days: number; spoken: string }[] = [
  { label: "Today", days: 0, spoken: "today" },
  { label: "Tomorrow", days: 1, spoken: "tomorrow" },
  { label: "This weekend", days: -1, spoken: "this weekend" }, // resolved at runtime
  { label: "Next week", days: 7, spoken: "next week" },
  { label: "In 2 weeks", days: 14, spoken: "in 2 weeks" },
  { label: "In a month", days: 30, spoken: "in a month" },
];

// Resolve "this weekend" to the upcoming Saturday
function thisWeekendIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 6=Sat
  const daysToSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToSat);
  return d.toISOString().slice(0, 10);
}

export function DatePickerScreen({ navigate }: DatePickerProps) {
  const {
    origin,
    destination,
    departureDate,
    setDepartureDate,
    searchFlights,
  } = useWizard();
  const [selected, setSelected] = useState<string>(departureDate || "");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected && departureDate) setSelected(departureDate);
  }, [departureDate, selected]);

  function resolvePreset(days: number, label: string): string {
    if (label === "This weekend") return thisWeekendIso();
    return addDaysIso(todayIso(), days);
  }

  function handlePresetClick(preset: { label: string; days: number }) {
    const d = resolvePreset(preset.days, preset.label);
    setSelected(d);
    setDepartureDate(d);
    speak({ text: `${preset.label}, ${formatDateSpoken(d)}, selected.` });
  }

  function handleTypedParse(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    // Try the native date input first
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      setSelected(cleaned);
      setDepartureDate(cleaned);
      speak({ text: `Date ${formatDateSpoken(cleaned)}, selected.` });
      return;
    }
    // Try matching presets
    const lc = cleaned.toLowerCase();
    const preset = QUICK_PRESETS.find((p) => p.spoken === lc || lc.includes(p.spoken));
    if (preset) {
      handlePresetClick(preset);
      return;
    }
    // Try "Month Day" e.g. "July 15"
    const monthMatch = lc.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/);
    if (monthMatch) {
      const monthNames: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      };
      const month = monthNames[monthMatch[1]];
      const day = parseInt(monthMatch[2], 10);
      const today = new Date();
      let year = today.getFullYear();
      const test = new Date(year, month, day);
      if (test < today) year += 1;
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setSelected(iso);
      setDepartureDate(iso);
      speak({ text: `${formatDateSpoken(iso)}, selected.` });
      return;
    }
    setError(`I didn't understand "${text}". Try "tomorrow" or "July 15".`);
  }

  async function handleContinue() {
    if (!selected) {
      setError("Please pick a date first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await searchFlights();
      navigate("results");
    } catch (e: any) {
      setError(e?.message ?? "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
            onClick={() => navigate("destination")}
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
            <h1 className="text-xl font-extrabold text-white">When are you flying?</h1>
            <p className="text-sm text-slate-400 truncate">
              {origin?.city} ({origin?.iata}) → {destination?.city} ({destination?.iata})
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Native date picker */}
        <GlassCard className="p-5">
          <label htmlFor="date-input" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            Pick a date
          </label>
          <div className="relative">
            <Calendar
              size={22}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="date-input"
              ref={inputRef}
              type="date"
              value={selected}
              min={todayIso()}
              onChange={(e) => {
                setSelected(e.target.value);
                setDepartureDate(e.target.value);
                if (e.target.value) speak({ text: `Date ${formatDateSpoken(e.target.value)}, selected.` });
              }}
              className="
                w-full h-[64px] pl-14 pr-4
                rounded-2xl
                bg-black/30 border border-white/10
                text-lg text-white
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60 focus:border-indigo-400/60
                [color-scheme:dark]
              "
              aria-describedby="date-helper"
            />
          </div>
          <p id="date-helper" className="text-sm text-slate-400 mt-3">
            Or use one of the quick options below
          </p>
        </GlassCard>

        {/* Quick presets */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            Quick options
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_PRESETS.map((p) => {
              const d = resolvePreset(p.days, p.label);
              const isSelected = selected === d;
              return (
                <motion.button
                  key={p.label}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePresetClick(p)}
                  aria-label={`${p.label}, ${formatDateSpoken(d)}`}
                  aria-pressed={isSelected}
                  className={`
                    min-h-[80px] rounded-2xl p-4 text-left
                    border transition-all
                    focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
                    ${
                      isSelected
                        ? "bg-indigo-500/20 border-indigo-400/60 ring-2 ring-indigo-400/40"
                        : "bg-white/5 border-white/10 hover:bg-white/8"
                    }
                  `}
                >
                  <p className="text-base font-bold text-white">{p.label}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{formatDate(d)}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Voice / typed input */}
        <GlassCard className="p-4">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
            Or say a date
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVoiceOpen((v) => !v)}
              aria-label={voiceOpen ? "Close voice input" : "Speak a date"}
              aria-expanded={voiceOpen}
              className="
                shrink-0 w-[60px] h-[60px] rounded-2xl
                flex items-center justify-center
                bg-indigo-500/20 hover:bg-indigo-500/30
                border border-indigo-400/30
                focus:outline-none focus:ring-4 focus:ring-indigo-400/70
                active:scale-95 transition-all
              "
            >
              <Mic size={24} color="#A5B4FC" aria-hidden="true" />
            </button>
            <label htmlFor="date-typed" className="sr-only">Type a date</label>
            <input
              id="date-typed"
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTypedParse(typedText);
                  setTypedText("");
                }
              }}
              placeholder='e.g. "tomorrow", "July 15"'
              className="
                flex-1 h-[60px] px-4 rounded-2xl
                bg-black/30 border border-white/10
                text-base text-white placeholder:text-slate-500
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              "
            />
            <button
              type="button"
              onClick={() => {
                handleTypedParse(typedText);
                setTypedText("");
              }}
              aria-label="Use typed date"
              disabled={!typedText.trim()}
              className="
                shrink-0 w-[60px] h-[60px] rounded-2xl
                flex items-center justify-center
                bg-indigo-500/30 hover:bg-indigo-500/40
                border border-indigo-400/40
                focus:outline-none focus:ring-4 focus:ring-indigo-400/70
                disabled:opacity-40
                active:scale-95 transition-all
              "
            >
              <Send size={22} color="#A5B4FC" aria-hidden="true" />
            </button>
          </div>
        </GlassCard>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30"
          >
            <p className="text-base text-red-200">{error}</p>
          </div>
        )}

        {/* Selected summary + Read aloud + Continue */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.15)" }}
                  aria-hidden="true"
                >
                  <Calendar size={22} className="text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-widest font-bold text-emerald-300">
                    Selected
                  </p>
                  <p className="text-lg font-bold text-white">{formatDate(selected)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speak({ text: `Selected date: ${formatDateSpoken(selected)}` })}
                  aria-label="Read selected date aloud"
                  className="
                    w-[60px] h-[60px] rounded-full shrink-0
                    flex items-center justify-center
                    bg-white/8 hover:bg-white/12 border border-white/10
                    focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                  "
                >
                  <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
                </button>
              </div>
            </GlassCard>

            <PrimaryButton
              onClick={handleContinue}
              loading={loading}
              size="xl"
              icon={<Plane size={22} />}
              className="w-full"
            >
              {loading ? "Searching flights…" : "Search flights"}
            </PrimaryButton>
          </motion.div>
        )}
      </div>
    </div>
  );
}
