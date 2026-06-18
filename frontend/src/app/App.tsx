/**
 * Wayfinder AI — App entry.
 * Wires up all screens + global state (wizard + user).
 *
 * Performance:
 * - All screens are loaded via React.lazy + Suspense so the initial
 *   bundle only ships Splash + Home + critical UI.
 * - Suspense fallback is a premium branded loader.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Screen, NavFn } from "../types";
import { WizardProvider } from "../hooks/useWizard";
import { UserProvider } from "../hooks/useUser";
import { speak, stopSpeaking } from "../hooks/useSpeech";

import { BottomNav } from "../components/ui/BottomNav";
import { SkipToContent } from "../components/ui/Accessibility";
import { tokens } from "../design-system";

// Eagerly loaded: needed for the very first paint
import { SplashScreen } from "../components/screens/SplashScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
import { VoiceScreen } from "../components/screens/VoiceScreen";

// Lazily loaded: split out so they only download when first visited
const AirportInput = lazy(() => import("../components/screens/AirportInput").then((m) => ({ default: m.AirportInput })));
const DatePickerScreen = lazy(() => import("../components/screens/DatePickerScreen").then((m) => ({ default: m.DatePickerScreen })));
const ResultsScreen = lazy(() => import("../components/screens/ResultsScreen").then((m) => ({ default: m.ResultsScreen })));
const FlightDetailScreen = lazy(() => import("../components/screens/FlightDetailScreen").then((m) => ({ default: m.FlightDetailScreen })));
const PassengerScreen = lazy(() => import("../components/screens/PassengerScreen").then((m) => ({ default: m.PassengerScreen })));
const AccessibilityScreen = lazy(() => import("../components/screens/AccessibilityScreen").then((m) => ({ default: m.AccessibilityScreen })));
const ReviewScreen = lazy(() => import("../components/screens/ReviewScreen").then((m) => ({ default: m.ReviewScreen })));
const SuccessScreen = lazy(() => import("../components/screens/SuccessScreen").then((m) => ({ default: m.SuccessScreen })));
const TripsScreen = lazy(() => import("../components/screens/TripsScreen").then((m) => ({ default: m.TripsScreen })));
const TripDetailScreen = lazy(() => import("../components/screens/TripDetailScreen").then((m) => ({ default: m.TripDetailScreen })));
const PortfolioScreen = lazy(() => import("../components/screens/PortfolioScreen").then((m) => ({ default: m.PortfolioScreen })));
const AssistantScreen = lazy(() => import("../components/screens/AssistantScreen").then((m) => ({ default: m.AssistantScreen })));
const ProfileScreen = lazy(() => import("../components/screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const SettingsScreen = lazy(() => import("../components/screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const LoadingScreen = lazy(() => import("../components/screens/LoadingScreen").then((m) => ({ default: m.LoadingScreen })));
const OnboardingScreen = lazy(() => import("../components/screens/OnboardingScreen").then((m) => ({ default: m.OnboardingScreen })));

const SCREEN_LABEL: Record<Screen, string> = {
  splash: "Splash screen",
  onboard1: "Onboarding, part 1",
  onboard2: "Onboarding, part 2",
  onboard3: "Onboarding, part 3",
  home: "Home",
  voice: "Voice assistant",
  origin: "Choose departure airport",
  destination: "Choose arrival airport",
  dates: "Choose departure date",
  loading: "Loading",
  results: "Available flights",
  flightDetail: "Flight details",
  passenger: "Passenger details",
  accessibility: "Accessibility",
  review: "Review your trip",
  payment: "Payment",
  success: "Booking confirmed",
  bookings: "My trips",
  tripDetail: "Trip details",
  assistant: "AI assistant",
  profile: "Profile",
  settingsScreen: "Settings",
  portfolio: "Travel stats",
};

function AppInner() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [params, setParams] = useState<Record<string, any> | undefined>(undefined);
  const previousScreen = useRef<Screen>("splash");

  const navigate: NavFn = useCallback((s, p) => {
    // Cancel any in-flight speech before announcing the new screen,
    // so a blind user gets exactly one announcement per navigation.
    stopSpeaking();
    setParams(p);
    setScreen(s);
  }, []);

  // Global TTS announcement on every screen change — critical for
  // blind users so they always know where they are without having
  // to remember. Each screen can also speak its own content via
  // useAutoRead; this just announces the route.
  useEffect(() => {
    if (screen === previousScreen.current) return;
    const label = SCREEN_LABEL[screen] || screen;
    speak({ text: label });
    previousScreen.current = screen;
  }, [screen]);

  function renderScreen() {
    switch (screen) {
      case "splash":
        return <SplashScreen navigate={navigate} />;
      case "onboard1":
        return <OnboardingScreen navigate={navigate} step={1} />;
      case "onboard2":
        return <OnboardingScreen navigate={navigate} step={2} />;
      case "onboard3":
        return <OnboardingScreen navigate={navigate} step={3} />;
      case "home":
        return <HomeScreen navigate={navigate} />;
      case "voice":
        return <VoiceScreen navigate={navigate} />;
      case "origin":
        return <AirportInput navigate={navigate} field="origin" />;
      case "destination":
        return <AirportInput navigate={navigate} field="destination" />;
      case "dates":
        return <DatePickerScreen navigate={navigate} />;
      case "loading":
        return <LoadingScreen message="Loading…" />;
      case "results":
        return <ResultsScreen navigate={navigate} />;
      case "flightDetail":
        return <FlightDetailScreen navigate={navigate} />;
      case "passenger":
        return <PassengerScreen navigate={navigate} />;
      case "accessibility":
        return <AccessibilityScreen navigate={navigate} />;
      case "review":
        return <ReviewScreen navigate={navigate} />;
      case "payment":
        // For this hackathon we skip payment — go straight to review/confirm
        return <ReviewScreen navigate={navigate} />;
      case "success":
        return <SuccessScreen navigate={navigate} params={params} />;
      case "bookings":
        return <TripsScreen navigate={navigate} />;
      case "tripDetail":
        return <TripDetailScreen navigate={navigate} params={params} />;
      case "assistant":
        return <AssistantScreen navigate={navigate} />;
      case "profile":
        return <ProfileScreen navigate={navigate} />;
      case "settingsScreen":
        return <SettingsScreen navigate={navigate} />;
      case "portfolio":
        return <PortfolioScreen navigate={navigate} />;
      default:
        return <HomeScreen navigate={navigate} />;
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background: "#060912",
        fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
      }}
    >
      <SkipToContent />
      <div
        className="relative w-full max-w-sm min-h-screen overflow-hidden"
        style={{ background: "#0B1020" }}
        id="main-content"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="min-h-screen"
          >
            <Suspense
              fallback={
                <div
                  className="min-h-screen flex items-center justify-center"
                  style={{ background: tokens.color.bg.deep }}
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="w-12 h-12 border-[3px] border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                </div>
              }
            >
              {renderScreen()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <BottomNav current={screen} navigate={navigate} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <WizardProvider>
        <AppInner />
      </WizardProvider>
    </UserProvider>
  );
}
