/**
 * ProfileScreen — user profile + quick links to settings and stats.
 */
import { useState } from "react";
import {
  User,
  Settings,
  BarChart3,
  Plane,
  Bookmark,
  Volume2,
  Edit3,
  Check,
  Sparkles,
  Heart,
} from "lucide-react";
import { useUser } from "../../hooks/useUser";
import { speak } from "../../hooks/useSpeech";
import { GlassCard } from "../ui/GlassCard";
import { PrimaryButton } from "../ui/PrimaryButton";
import { NavFn } from "../../types";

interface ProfileScreenProps {
  navigate: NavFn;
}

export function ProfileScreen({ navigate }: ProfileScreenProps) {
  const { profile, setProfile, trips, userId } = useUser();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const upcoming = trips.filter(
    (t) => t.status === "confirmed" && t.departure_date >= new Date().toISOString().slice(0, 10)
  ).length;

  function handleSave() {
    if (nameInput.trim()) {
      setProfile({ name: nameInput.trim() });
      speak({ text: `Name updated to ${nameInput.trim()}` });
    }
    setEditing(false);
  }

  function handleRead() {
    speak({
      text: `Profile. Name ${profile.name}. User ID ${userId}. ${trips.length} total trips. ${upcoming} upcoming.`,
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
          <div
            className="w-[60px] h-[60px] rounded-full shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
            aria-hidden="true"
          >
            <User size={26} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white">Profile</h1>
            <p className="text-sm text-slate-400 truncate">{profile.name}</p>
          </div>
          <button
            type="button"
            onClick={handleRead}
            aria-label="Read profile aloud"
            className="
              w-[60px] h-[60px] rounded-full shrink-0
              flex items-center justify-center
              bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30
              focus:outline-none focus:ring-4 focus:ring-indigo-400/70
            "
          >
            <Volume2 size={22} color="#A5B4FC" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Name + avatar */}
        <GlassCard className="p-5" ariaLabel="Profile card">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#4F46E5,#22C55E)" }}
              aria-hidden="true"
            >
              <User size={36} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <label htmlFor="profile-name" className="block">
                  <span className="sr-only">Your name</span>
                  <input
                    id="profile-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="
                      w-full h-[48px] px-3 rounded-xl
                      bg-black/30 border border-white/10
                      text-lg font-bold text-white
                      focus:outline-none focus:ring-4 focus:ring-indigo-400/60
                    "
                    autoFocus
                  />
                </label>
              ) : (
                <p className="text-2xl font-extrabold text-white">{profile.name}</p>
              )}
              <p className="text-sm text-slate-400 mt-1">Wayfinder member</p>
            </div>
            <button
              type="button"
              onClick={editing ? handleSave : () => setEditing(true)}
              aria-label={editing ? "Save name" : "Edit name"}
              className="
                shrink-0 w-[52px] h-[52px] rounded-full
                flex items-center justify-center
                bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30
                focus:outline-none focus:ring-4 focus:ring-indigo-400/60
              "
            >
              {editing ? (
                <Check size={22} color="#A5B4FC" aria-hidden="true" />
              ) : (
                <Edit3 size={20} color="#A5B4FC" aria-hidden="true" />
              )}
            </button>
          </div>
        </GlassCard>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Total trips"
            value={String(trips.length)}
            icon={<Plane size={20} className="text-indigo-300" aria-hidden="true" />}
            onClick={() => navigate("bookings")}
            ariaLabel={`Total trips: ${trips.length}. Tap to view all.`}
          />
          <StatTile
            label="Upcoming"
            value={String(upcoming)}
            icon={<Bookmark size={20} className="text-emerald-300" aria-hidden="true" />}
            onClick={() => navigate("bookings")}
            ariaLabel={`Upcoming trips: ${upcoming}. Tap to view all.`}
          />
        </div>

        {/* Menu items */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
            More
          </h2>
          <div className="space-y-2">
            <MenuItem
              icon={<BarChart3 size={20} className="text-emerald-300" aria-hidden="true" />}
              label="Travel stats"
              description="Trips, spending, favourite route"
              onClick={() => navigate("portfolio")}
            />
            <MenuItem
              icon={<Heart size={20} className="text-pink-300" aria-hidden="true" />}
              label="Accessibility"
              description="Voice speed, font, contrast"
              onClick={() => navigate("settingsScreen")}
            />
            <MenuItem
              icon={<Settings size={20} className="text-slate-300" aria-hidden="true" />}
              label="Settings"
              description="Profile and preferences"
              onClick={() => navigate("settingsScreen")}
            />
            <MenuItem
              icon={<Sparkles size={20} className="text-indigo-300" aria-hidden="true" />}
              label="AI Assistant"
              description="Chat with your travel assistant"
              onClick={() => navigate("assistant")}
            />
          </div>
        </div>

        <PrimaryButton
          onClick={() => navigate("voice")}
          size="lg"
          icon={<Plane size={20} />}
          className="w-full"
        >
          Book a new flight
        </PrimaryButton>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <GlassCard className="p-4" onClick={onClick} ariaLabel={ariaLabel}>
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <p className="text-3xl font-extrabold text-white">{value}</p>
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </GlassCard>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <GlassCard className="p-4" onClick={onClick} ariaLabel={`${label}. ${description}`}>
      <div className="flex items-center gap-4">
        <div
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-white">{label}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </GlassCard>
  );
}
