/**
 * useUser — minimal user profile + trip history context
 */
import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from "react";
import { api } from "../services/api";
import type { BookingResult } from "../types";

interface UserProfile {
  name: string;
  preferredCurrency: string;
  voiceRate: number;
  voicePitch: number;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Traveler",
  preferredCurrency: "GBP",
  voiceRate: 0.95,
  voicePitch: 1.0,
};

interface UserContextValue {
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  trips: BookingResult[];
  loadingTrips: boolean;
  refreshTrips: () => Promise<void>;
  userId: string;
}

const UserContext = createContext<UserContextValue | null>(null);

const PROFILE_KEY = "wayfinder.profile";
const USER_ID_KEY = "wayfinder.user_id";

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PROFILE;
}

function getOrCreateUserId(): string {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);
  const [trips, setTrips] = useState<BookingResult[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [userId] = useState<string>(getOrCreateUserId);

  const setProfile = useCallback((p: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const refreshTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      const res = await api.getHistory(userId, 50);
      setTrips(res.bookings || []);
    } catch {
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }, [userId]);

  // Load trips on mount + when userId changes
  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  const value = useMemo<UserContextValue>(
    () => ({ profile, setProfile, trips, loadingTrips, refreshTrips, userId }),
    [profile, setProfile, trips, loadingTrips, refreshTrips, userId]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside <UserProvider>");
  return ctx;
}
