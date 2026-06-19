/**
 * useScreenHelp — returns a context-aware help object for the
 * current screen. Used by PersistentHelpButton and any other UI
 * that wants to know what to say about "what is on this screen".
 *
 * Each screen has:
 *   - title: short screen name (e.g. "Choose departure airport")
 *   - subtitle: one-sentence context
 *   - primaryAction: what the user should do
 *   - voiceCommand: a phrase the user can speak to act
 *
 * Use getFullHelp() to get a TTS-ready paragraph.
 */
import { Screen } from "../types";

interface ScreenHelp {
  title: string;
  subtitle: string;
  primaryAction: string;
  voiceCommand: string;
  getFullHelp: () => string;
}

const SCREEN_HELP: Record<Screen, Omit<ScreenHelp, "getFullHelp">> = {
  splash: {
    title: "Welcome screen",
    subtitle: "Wayfinder AI starting up.",
    primaryAction: "Tap Get Started to continue.",
    voiceCommand: "Get started",
  },
  onboard1: {
    title: "Voice first",
    subtitle: "Just speak. We book, confirm, and read back.",
    primaryAction: "Swipe to continue.",
    voiceCommand: "Next",
  },
  onboard2: {
    title: "Real-time flights",
    subtitle: "Search thousands of destinations. Cheapest read aloud.",
    primaryAction: "Swipe to continue.",
    voiceCommand: "Next",
  },
  onboard3: {
    title: "Built for everyone",
    subtitle: "Designed for blind and visually impaired travelers.",
    primaryAction: "Tap Get Started.",
    voiceCommand: "Get started",
  },
  home: {
    title: "Home",
    subtitle: "Voice booking and quick actions.",
    primaryAction: "Tap the microphone to start booking by voice, or tap Book flight.",
    voiceCommand: "Book a flight from London to Paris tomorrow",
  },
  voice: {
    title: "Voice assistant",
    subtitle: "Speak to book, search, or check your trips.",
    primaryAction: "Tap the microphone and say what you want. Or type a command.",
    voiceCommand: "Book a flight from London to Paris tomorrow",
  },
  origin: {
    title: "Choose departure airport",
    subtitle: "Tell us where you're flying from.",
    primaryAction: "Search or tap a recent / popular airport. Or speak it.",
    voiceCommand: "London Heathrow",
  },
  destination: {
    title: "Choose arrival airport",
    subtitle: "Where do you want to go?",
    primaryAction: "Search or tap a recent / popular airport. Or speak it.",
    voiceCommand: "Paris Charles de Gaulle",
  },
  dates: {
    title: "Choose departure date",
    subtitle: "When are you flying?",
    primaryAction: "Use the calendar, pick a quick option, or say a date.",
    voiceCommand: "Tomorrow",
  },
  loading: {
    title: "Loading",
    subtitle: "Just a moment.",
    primaryAction: "Please wait.",
    voiceCommand: "",
  },
  results: {
    title: "Available flights",
    subtitle: "We found flights for you.",
    primaryAction: "Tap a flight to select it. The cheapest is at the top.",
    voiceCommand: "Read all flights aloud",
  },
  flightDetail: {
    title: "Flight details",
    subtitle: "More information about this flight.",
    primaryAction: "Tap Select to continue.",
    voiceCommand: "Select this flight",
  },
  passenger: {
    title: "Passenger details",
    subtitle: "Your name and assistance needs.",
    primaryAction: "Type or speak the passenger's full name. Pick any assistance.",
    voiceCommand: "Passenger name Priya Sharma",
  },
  accessibility: {
    title: "Accessibility",
    subtitle: "Confirm your assistance choices.",
    primaryAction: "If everything looks right, tap Looks good. Otherwise tap Edit.",
    voiceCommand: "Looks good",
  },
  review: {
    title: "Review your trip",
    subtitle: "Last check before booking.",
    primaryAction: "Tap Confirm and pay. Or say 'yes' or 'confirm'.",
    voiceCommand: "Yes",
  },
  payment: {
    title: "Payment",
    subtitle: "Enter your payment details.",
    primaryAction: "Complete payment.",
    voiceCommand: "",
  },
  success: {
    title: "Booking confirmed",
    subtitle: "Your trip is booked.",
    primaryAction: "Tap View my trips to see it, or Book another flight.",
    voiceCommand: "View my trips",
  },
  bookings: {
    title: "My trips",
    subtitle: "Your upcoming and past flights.",
    primaryAction: "Tap a trip for details. Swipe down to refresh.",
    voiceCommand: "Read all trips aloud",
  },
  tripDetail: {
    title: "Trip details",
    subtitle: "Information about this trip.",
    primaryAction: "Tap Change date to reschedule, or Cancel flight.",
    voiceCommand: "Cancel flight",
  },
  assistant: {
    title: "AI assistant",
    subtitle: "Chat with your travel assistant.",
    primaryAction: "Type a message or tap a quick action.",
    voiceCommand: "Book a flight",
  },
  profile: {
    title: "Profile",
    subtitle: "Your account and travel stats.",
    primaryAction: "Tap Travel stats for insights, or AI assistant to chat.",
    voiceCommand: "Open my travel stats",
  },
  settingsScreen: {
    title: "Settings",
    subtitle: "Voice and accessibility preferences.",
    primaryAction: "Adjust the voice rate, pitch, then Save.",
    voiceCommand: "Save settings",
  },
  portfolio: {
    title: "Travel stats",
    subtitle: "Your trip history, spending, and favourite route.",
    primaryAction: "Tap any stat to read it aloud. Tap a trip to view details.",
    voiceCommand: "Read all stats aloud",
  },
};

export function useScreenHelp(screen: Screen): ScreenHelp {
  const help = SCREEN_HELP[screen] || SCREEN_HELP.home;
  return {
    ...help,
    getFullHelp: () =>
      `${help.title}. ${help.subtitle} ${help.primaryAction}${
        help.voiceCommand ? ` You can also say: "${help.voiceCommand}".` : ""
      }`,
  };
}
