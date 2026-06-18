/**
 * SettingsScreen — voice & accessibility preferences.
 *
 * Critical for blind users. Two main controls:
 * - Voice rate (0.5x - 2x): how fast the assistant speaks
 * - Voice pitch (0 - 2): how high or low
 *
 * "Test voice" speaks a sample sentence with the current settings
 * so the user can hear the result before saving. "Save" persists
 * to localStorage. "Reset" restores defaults.
 *
 * Accessibility:
 * - All sliders have aria-valuemin/max/now
 * - Live region announces rate/pitch on mount for screen readers
 * - "Test voice" button has 60px+ touch target
 * - Haptic feedback on every interaction
 * - All text in 16px+ for low-vision users
 */
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Volume2,
  Eye,
  Save,
  Check,
  RotateCcw,
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak, loadTtsSettings, saveTtsSettings } from "../../hooks/useSpeech";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { haptic } from "../../lib/haptics";
import { tokens, type } from "../../design-system";
import { NavFn } from "../../types";

interface SettingsScreenProps {
  navigate: NavFn;
}

const DEFAULT_TTS = { rate: 0.95, pitch: 1.0 };

export function SettingsScreen({ navigate }: SettingsScreenProps) {
  const { profile, setProfile } = useUser();
  const tts = loadTtsSettings();
  const [rate, setRate] = useState(tts.rate);
  const [pitch, setPitch] = useState(tts.pitch);

  useEffect(() => {
    const t = setTimeout(() => {
      speak({
        text: `Settings. Voice rate ${rate.toFixed(2)} times. Pitch ${pitch.toFixed(2)}. Preferred currency ${profile.preferredCurrency}.`,
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    haptic.success();
    saveTtsSettings({ ...tts, rate, pitch });
    setProfile({ voiceRate: rate, voicePitch: pitch });
    speak({ text: "Settings saved." });
  }

  function handleTest() {
    haptic.tap();
    speak({
      text: `Hello ${profile.name.split(" ")[0]}. This is how I sound at rate ${rate.toFixed(2)} and pitch ${pitch.toFixed(2)}.`,
      rate,
      pitch,
    });
  }

  function handleReset() {
    haptic.tap();
    setRate(DEFAULT_TTS.rate);
    setPitch(DEFAULT_TTS.pitch);
    speak({
      text: "Voice settings reset to defaults.",
    });
  }

  function handleBack() {
    haptic.tap();
    navigate("profile");
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
              Settings
            </h1>
            <p className="text-slate-400 truncate" style={type.bodySm as any}>
              Voice and accessibility
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Voice settings */}
        <Card variant="default" padding="lg" ariaLabel="Voice settings">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.2)" }}
              aria-hidden="true"
            >
              <Volume2 size={22} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-slate-400 mb-0.5" style={type.eyebrow as any}>
                Voice
              </p>
              <p className="text-white" style={{ ...type.h4, fontWeight: 700 }}>
                How I speak
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="rate"
                  className="text-white"
                  style={type.label}
                >
                  Speech rate
                </label>
                <span
                  className="text-white tabular-nums"
                  style={{ ...type.h4, fontWeight: 800 }}
                  aria-live="polite"
                >
                  {rate.toFixed(2)}x
                </span>
              </div>
              <input
                id="rate"
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={rate}
                onChange={(e) => {
                  setRate(parseFloat(e.target.value));
                  haptic.tap();
                }}
                aria-valuemin={0.5}
                aria-valuemax={2}
                aria-valuenow={rate}
                aria-label={`Speech rate, currently ${rate.toFixed(2)} times`}
                className="w-full h-3 rounded-full appearance-none bg-white/10 accent-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 cursor-pointer"
                style={{ accentColor: "#6366F1" }}
              />
              <div
                className="flex justify-between mt-2"
                style={type.caption as any}
              >
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>

            {/* Pitch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="pitch"
                  className="text-white"
                  style={type.label}
                >
                  Pitch
                </label>
                <span
                  className="text-white tabular-nums"
                  style={{ ...type.h4, fontWeight: 800 }}
                  aria-live="polite"
                >
                  {pitch.toFixed(2)}
                </span>
              </div>
              <input
                id="pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => {
                  setPitch(parseFloat(e.target.value));
                  haptic.tap();
                }}
                aria-valuemin={0}
                aria-valuemax={2}
                aria-valuenow={pitch}
                aria-label={`Pitch, currently ${pitch.toFixed(2)}`}
                className="w-full h-3 rounded-full appearance-none bg-white/10 accent-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/60 cursor-pointer"
                style={{ accentColor: "#6366F1" }}
              />
              <div
                className="flex justify-between mt-2"
                style={type.caption as any}
              >
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleTest}
              variant="secondary"
              size="md"
              icon={<Volume2 size={18} />}
              className="flex-1"
            >
              Test voice
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="md"
              icon={<RotateCcw size={18} />}
              aria-label="Reset to defaults"
            >
              Reset
            </Button>
          </div>
        </Card>

        {/* Accessibility summary */}
        <Card variant="success" padding="lg" ariaLabel="Accessibility features">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.2)" }}
              aria-hidden="true"
            >
              <Eye size={22} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-emerald-300 mb-0.5" style={type.eyebrow as any}>
                Accessibility
              </p>
              <p className="text-white" style={{ ...type.h4, fontWeight: 700 }}>
                What's enabled
              </p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[
              "WCAG AA contrast (4.5:1 minimum)",
              "60px+ touch targets",
              "Auto-focus on voice screens",
              "Auto-read all responses aloud",
              "Reduced-motion support",
              "VoiceOver / TalkBack friendly",
              "Haptic feedback on Android",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5"
                style={type.body as any}
              >
                <Check
                  size={18}
                  className="text-emerald-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-slate-200">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Button
          onClick={handleSave}
          size="xl"
          icon={<Save size={22} />}
          fullWidth
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}
