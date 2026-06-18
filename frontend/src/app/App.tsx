/**
 * Wayfinder AI — App entry.
 * Wires up all screens + global state (wizard + user).
 */
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Screen, NavFn } from "../types";
import { WizardProvider } from "../hooks/useWizard";
import { UserProvider } from "../hooks/useUser";

import { BottomNav } from "../components/ui/BottomNav";
import { SkipToContent } from "../components/ui/Accessibility";
import { SplashScreen } from "../components/screens/SplashScreen";
import { HomeScreen } from "../components/screens/HomeScreen";
import { VoiceScreen } from "../components/screens/VoiceScreen";
import { AirportInput } from "../components/screens/AirportInput";
import { DatePickerScreen } from "../components/screens/DatePickerScreen";
import { ResultsScreen } from "../components/screens/ResultsScreen";
import { FlightDetailScreen } from "../components/screens/FlightDetailScreen";
import { PassengerScreen } from "../components/screens/PassengerScreen";
import { AccessibilityScreen } from "../components/screens/AccessibilityScreen";
import { ReviewScreen } from "../components/screens/ReviewScreen";
import { SuccessScreen } from "../components/screens/SuccessScreen";
import { TripsScreen } from "../components/screens/TripsScreen";
import { TripDetailScreen } from "../components/screens/TripDetailScreen";
import { PortfolioScreen } from "../components/screens/PortfolioScreen";
import { AssistantScreen } from "../components/screens/AssistantScreen";
import { ProfileScreen } from "../components/screens/ProfileScreen";
import { SettingsScreen } from "../components/screens/SettingsScreen";
import { LoadingScreen } from "../components/screens/LoadingScreen";
import { OnboardingScreen } from "../components/screens/OnboardingScreen";

function AppInner() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [params, setParams] = useState<Record<string, any> | undefined>(undefined);

  const navigate: NavFn = useCallback((s, p) => {
    setParams(p);
    setScreen(s);
  }, []);

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
            {renderScreen()}
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
