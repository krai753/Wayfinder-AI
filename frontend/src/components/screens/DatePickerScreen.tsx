/**
 * DatePickerScreen — pick a departure date.
 *
 * Premium-quality date picker with:
 * - Native date input (Doppelrand) as the canonical input
 * - Quick preset chips (Today, Tomorrow, This weekend, Next week, etc.)
 * - Voice-typed date parsing ("July 15", "tomorrow")
 * - Voice state auto-announced on each step
 * - Haptic feedback on every interaction
 * - Massive (60px+) touch targets
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Mic,
  Send,
  Volume2,
  Plane,
} from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { speak } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { haptic } from "../../lib/haptics";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";
import { addDaysIso, formatDate, formatDateSpoken, todayIso } from "../../lib/format";

interface DatePickerProps {
  navigate: NavFn;
}

const QUICK_PRESETS: { label: string; days: number; spoken: string }[] = [
  { label: "Today", days: 0, spoken: "today" },
  { label: "Tomorrow", days: 1, spoken: "tomorrow" },
  { label: "This weekend", days: -1, spoken: "this weekend" },
  { label: "Next week", days: 7, spoken: "next week" },
  { label: "In 2 weeks", days: 14, spoken: "in 2 weeks" },
  { label: "In a month", days: 30, spoken: "in a month" },
];

function thisWeekendIso(): string {
  const d = new Date();
  const day = d.getDay();
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

  // Auto-read the screen state for blind users
  useEffect(() => {
    const t = setTimeout(() => {
      speak({
        text: "Choose a departure date. You can use the calendar, pick a quick option, or speak a date like 'July 15' or 'tomorrow'.",
      });
    }, 600);
    return () => clearTimeout(t);
  }, []);

  function resolvePreset(days: number, label: string): string {
    if (label === "This weekend") return thisWeekendIso();
    return addDaysIso(todayIso(), days);
  }

  function handlePresetClick(preset: { label: string; days: number }) {
    haptic.select();
    const d = resolvePreset(preset.days, preset.label);
    setSelected(d);
    setDepartureDate(d);
    speak({ text: `${preset.label}, ${formatDateSpoken(d)}, selected.` });
  }

  function handleTypedParse(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      haptic.select();
      setSelected(cleaned);
      setDepartureDate(cleaned);
      speak({ text: `Date ${formatDateSpoken(cleaned)}, selected.` });
      return;
    }
    const lc = cleaned.toLowerCase();
    const preset = QUICK_PRESETS.find((p) => p.spoken === lc || lc.includes(p.spoken));
    if (preset) {
      handlePresetClick(preset);
      return;
    }
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
      haptic.select();
      setSelected(iso);
      setDepartureDate(iso);
      speak({ text: `${formatDateSpoken(iso)}, selected.` });
      return;
    }
    haptic.warning();
    setError(`I didn't understand "${text}". Try "tomorrow" or "July 15".`);
  }

  async function handleContinue() {
    if (!selected) {
      haptic.warning();
      setError("Please pick a date first.");
      return;
    }
    haptic.tap();
    setLoading(true);
    setError(null);
    try {
      await searchFlights();
      haptic.success();
      navigate("results");
    } catch (e: any) {
      haptic.warning();
      setError(e?.message ?? "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    haptic.tap();
    navigate("destination");
  }

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
            onClick={handleBack}
            aria-label="Back"
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] transition-colors"
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white" style={type.h3 as any}>
              When are you flying?
            </h1>
            <p className="text-slate-400 truncate" style={type.bodySm as any}>
              {origin?.city} ({origin?.iata}) → {destination?.city} ({destination?.iata})
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Native date picker (Doppelrand) */}
        <Card variant="default" padding="md" ariaLabel="Calendar date input">
          <label
            htmlFor="date-input"
            className="block text-slate-300 mb-3"
            style={type.eyebrow as any}
          >
            Pick a date
          </label>
          <div
            className="relative border"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              borderColor: "rgba(255, 255, 255, 0.10)",
              borderRadius: tokens.radius["2xl"],
              boxShadow: tokens.elevation.insetHighlight,
            }}
          >
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
                haptic.tap();
                setSelected(e.target.value);
                setDepartureDate(e.target.value);
                if (e.target.value) speak({ text: `Date ${formatDateSpoken(e.target.value)}, selected.` });
              }}
              aria-label="Departure date"
              className="w-full h-[64px] pl-14 pr-4 bg-transparent border-0 outline-none text-white focus:ring-0"
              style={{ colorScheme: "dark" } as any}
            />
          </div>
          <p className="text-slate-400 mt-3" style={type.bodySm as any}>
            Or use one of the quick options below
          </p>
        </Card>

        {/* Quick presets */}
        <div>
          <h2 className="text-slate-400 mb-3" style={type.eyebrow as any}>
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
                  className={`min-h-[80px] rounded-2xl p-4 text-left border transition-all focus:outline-none focus:ring-4 focus:ring-indigo-300/70 focus:ring-offset-2 focus:ring-offset-[#0B1020] ${
                    isSelected
                      ? "bg-indigo-500/20 border-indigo-400/60 ring-2 ring-indigo-400/40"
                      : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                  }`}
                >
                  <p className="text-white" style={{ ...type.bodyLg as any, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {p.label}
                  </p>
                  <p className="text-slate-400 mt-0.5" style={type.bodySm as any}>
                    {formatDate(d)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Voice / typed input */}
        <Card variant="default" padding="md" ariaLabel="Say a date">
          <p className="text-slate-300 mb-3" style={type.eyebrow as any}>
            Or say a date
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                haptic.tap();
                setVoiceOpen((v) => !v);
              }}
              aria-label={voiceOpen ? "Close voice input" : "Speak a date"}
              aria-expanded={voiceOpen}
              className="shrink-0 w-[60px] h-[60px] rounded-2xl flex items-center justify-center bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 active:scale-95 transition-all"
            >
              <Mic size={24} color="#A5B4FC" aria-hidden="true" />
            </button>
            <label htmlFor="date-typed" className="sr-only">
              Type a date
            </label>
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
              className="flex-1 h-[60px] px-4 rounded-2xl bg-black/30 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/60"
              style={type.bodyLg as any}
            />
            <button
              type="button"
              onClick={() => {
                handleTypedParse(typedText);
                setTypedText("");
              }}
              aria-label="Use typed date"
              disabled={!typedText.trim()}
              className="shrink-0 w-[60px] h-[60px] rounded-2xl flex items-center justify-center bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-400/40 focus:outline-none focus:ring-4 focus:ring-indigo-300/70 disabled:opacity-40 active:scale-95 transition-all"
            >
              <Send size={22} color="#A5B4FC" aria-hidden="true" />
            </button>
          </div>
        </Card>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-500/15 border border-red-400/30"
          >
            <p className="text-red-200" style={type.body as any}>
              {error}
            </p>
          </div>
        )}

        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <Card variant="success" padding="md" ariaLabel="Selected date">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.18)" }}
                  aria-hidden="true"
                >
                  <Calendar size={22} className="text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-300 mb-1" style={type.eyebrow as any}>
                    Selected
                  </p>
                  <p
                    className="text-white"
                    style={{ ...type.h3, fontWeight: 700 }}
                  >
                    {formatDate(selected)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptic.tap();
                    speak({ text: `Selected date: ${formatDateSpoken(selected)}` });
                  }}
                  aria-label="Read selected date aloud"
                  className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center bg-white/8 hover:bg-white/12 border border-white/10 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 transition-colors"
                >
                  <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
                </button>
              </div>
            </Card>

            <Button
              onClick={handleContinue}
              loading={loading}
              size="xl"
              icon={<Plane size={22} />}
              fullWidth
            >
              {loading ? "Searching flights…" : "Search flights"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
