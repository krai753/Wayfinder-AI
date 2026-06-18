/**
 * SettingsScreen — accessibility & voice preferences.
 */
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Volume2,
  Eye,
  Save,
  Check,
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak, loadTtsSettings, saveTtsSettings } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";

interface SettingsScreenProps {
  navigate: NavFn;
}

export function SettingsScreen({ navigate }: SettingsScreenProps) {
  const { profile, setProfile } = useUser();
  const tts = loadTtsSettings();
  const [rate, setRate] = useState(tts.rate);
  const [pitch, setPitch] = useState(tts.pitch);

  useEffect(() => {
    speak({
      text: `Settings. Voice rate ${rate.toFixed(2)}. Pitch ${pitch.toFixed(2)}. Preferred currency ${profile.preferredCurrency}.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    saveTtsSettings({ ...tts, rate, pitch });
    setProfile({ voiceRate: rate, voicePitch: pitch });
    speak({ text: "Settings saved." });
  }

  function handleTest() {
    speak({
      text: `Hello ${profile.name.split(" ")[0]}. This is how I sound.`,
      rate,
      pitch,
    });
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0B1020" }}>
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
            onClick={() => navigate("profile")}
            aria-label="Back"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-white/8 hover:bg-white/12 border border-white/10
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]
            "
          >
            <ArrowLeft size={26} color="#fff" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">Settings</h1>
            <p className="text-sm text-slate-400">Voice and accessibility</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Voice rate */}
        <GlassCard className="p-5" ariaLabel="Voice settings">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.2)" }}
              aria-hidden="true"
            >
              <Volume2 size={20} className="text-indigo-300" />
            </div>
            <p className="text-base font-bold text-white">Voice</p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="rate" className="text-sm font-semibold text-slate-300">
                  Speech rate
                </label>
                <span className="text-base font-bold text-white">{rate.toFixed(2)}x</span>
              </div>
              <input
                id="rate"
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                aria-valuemin={0.5}
                aria-valuemax={2}
                aria-valuenow={rate}
                className="w-full h-3 rounded-full appearance-none bg-white/10 accent-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="pitch" className="text-sm font-semibold text-slate-300">
                  Pitch
                </label>
                <span className="text-base font-bold text-white">{pitch.toFixed(2)}</span>
              </div>
              <input
                id="pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                aria-valuemin={0}
                aria-valuemax={2}
                aria-valuenow={pitch}
                className="w-full h-3 rounded-full appearance-none bg-white/10 accent-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/60"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <PrimaryButton
              onClick={handleTest}
              variant="secondary"
              size="md"
              icon={<Volume2 size={18} />}
              className="flex-1"
            >
              Test voice
            </PrimaryButton>
          </div>
        </GlassCard>

        {/* Accessibility info */}
        <GlassCard className="p-5" ariaLabel="Accessibility information">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.2)" }}
              aria-hidden="true"
            >
              <Eye size={20} className="text-emerald-300" />
            </div>
            <p className="text-base font-bold text-white">Accessibility</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>WCAG AA contrast (4.5:1 minimum)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>60px+ touch targets for easy tapping</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Auto-focus on voice screens</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Auto-read all responses aloud</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Reduced-motion support</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Screen reader (VoiceOver / TalkBack) friendly</span>
            </li>
          </ul>
        </GlassCard>

        <PrimaryButton
          onClick={handleSave}
          size="xl"
          icon={<Save size={22} />}
          className="w-full"
        >
          Save settings
        </PrimaryButton>
      </div>
    </div>
  );
}
