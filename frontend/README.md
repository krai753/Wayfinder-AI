# Wayfinder AI — Frontend

> **Voice-first, accessible flight booking interface for blind and
> visually impaired travelers.** Built for hackathons, investors, and
> real users in busy airports.

Designed from the perspective of a blind user. Every screen
auto-announces itself. The mic is the largest element. Every
critical action has a voice alternative. WCAG 2.1 AA compliant.

![Status](https://img.shields.io/badge/CI-success-22C55E)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-22C55E)
![Mobile](https://img.shields.io/badge/Mobile-first-A5B4FC)

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

**Test the voice UI:** Chrome on Android or Desktop. iOS Safari
disables the Vibration API (Apple's policy) but voice still works.

**Recommended:** use the Chrome DevTools "Emulate vision deficiencies"
panel under `Rendering` to see the screen as a color-blind or
low-vision user would.

---

## What's in the box

### For blind / VI users
- **140px auto-focused mic** — the largest, most prominent element
  on the home screen. Findable by touch alone.
- **Triple-layer pulse + ripple + glow** while recording, with a
  color shift to red so partial-vision users can see it.
- **Auto-TTS on every screen** — every screen reads its own name,
  context, primary action, and a voice command you can speak.
- **Vibration API feedback** on every tap, select, success, warning.
- **60px+ touch targets** (WCAG AAA level).
- **4.5:1+ color contrast** (WCAG AA level).
- **4px focus-visible rings** with offset for keyboard navigation.
- **Skip-to-content** link at the very top.
- **Persistent "Where am I?"** floating help button on every
  content screen. One tap reads what you can do and what you can
  say.
- **Reduced-motion** support throughout (vestibular accessibility).
- **Voice confirmation** for destructive actions (say "yes" or
  "confirm" to book / cancel).

### Premium polish
- "Ethereal Glass" aesthetic — deep OLED backgrounds, restrained
  glass surfaces, indigo→emerald accents.
- Doppelrand (double-bezel) card architecture — every premium card
  uses nested enclosures with concentric curves.
- Button-in-Button trailing icon with hover physics.
- Spring whileTap for tactile feedback.
- Editorial type scale (Plus Jakarta Sans) with massive
  display sizes for hero areas.
- Glassmorphism: backdrop-blur(20px), 5-layer halos, custom
  cubic-bezier easings.

### Engineering quality
- **TypeScript strict** with `noUnusedLocals` and `noUnusedParameters`.
- **React.lazy** code-splitting on 16 screens (only Splash, Home,
  and Voice are eager — they're needed for the very first paint).
- **React Context** for global state (no Redux, no Zustand needed).
- **Custom hooks**: `useWizard`, `useUser`, `useSpeech`,
  `useLocation`, `useScreenHelp`, `useAutoRead`.
- **Design tokens** as the single source of truth for color, type,
  spacing, motion, elevation, z-index.
- **GitHub Actions CI** (1 workflow, 2 jobs — typecheck + build,
  backend syntax).

---

## Project structure

```
frontend/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Typecheck + build + backend syntax
│
├── src/
│   ├── app/
│   │   └── App.tsx                   # Router, providers, global TTS, lazy loading
│   │
│   ├── design-system/
│   │   ├── index.ts                  # Re-export
│   │   └── tokens.ts                 # color, type, space, motion, elevation
│   │
│   ├── components/
│   │   ├── ui/                       # Reusable, design-system-aligned
│   │   │   ├── Button.tsx            # Button-in-Button, 5 variants × 5 sizes
│   │   │   ├── Card.tsx              # Doppelrand, 5 variants
│   │   │   ├── Input.tsx             # Floating-label input
│   │   │   ├── VoiceMicButton.tsx    # 100/120/140px mic with pulse + ripple
│   │   │   ├── VoiceWave.tsx         # Animated waveform
│   │   │   ├── VoiceStatusBanner.tsx
│   │   │   ├── ScreenHeader.tsx
│   │   │   ├── NavPair.tsx           # Back/forward nav pair
│   │   │   ├── BottomNav.tsx         # Floating glass tab bar
│   │   │   ├── PersistentHelpButton.tsx  # "Where am I?" floating help
│   │   │   ├── Accessibility.tsx     # SkipToContent, VisuallyHidden, useAutoRead
│   │   │   ├── Badge.tsx
│   │   │   ├── GlassCard.tsx         # Re-export of Card (legacy)
│   │   │   └── PrimaryButton.tsx     # Re-export of Button (legacy)
│   │   │
│   │   └── screens/                  # One file per screen, all lazy
│   │       ├── SplashScreen.tsx
│   │       ├── OnboardingScreen.tsx
│   │       ├── HomeScreen.tsx
│   │       ├── VoiceScreen.tsx
│   │       ├── AirportInput.tsx
│   │       ├── DatePickerScreen.tsx
│   │       ├── ResultsScreen.tsx
│   │       ├── FlightDetailScreen.tsx
│   │       ├── PassengerScreen.tsx
│   │       ├── AccessibilityScreen.tsx
│   │       ├── ReviewScreen.tsx
│   │       ├── SuccessScreen.tsx
│   │       ├── TripsScreen.tsx
│   │       ├── TripDetailScreen.tsx
│   │       ├── PortfolioScreen.tsx
│   │       ├── AssistantScreen.tsx
│   │       ├── ProfileScreen.tsx
│   │       ├── SettingsScreen.tsx
│   │       └── LoadingScreen.tsx
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useWizard.tsx             # Booking flow state (origin/dest/date/offer)
│   │   ├── useUser.tsx               # User profile + trip history
│   │   ├── useSpeech.ts              # Web Speech API (TTS + STT) wrapper
│   │   ├── useLocation.ts            # Current screen broadcaster
│   │   └── useScreenHelp.ts          # Per-screen help text
│   │
│   ├── lib/
│   │   ├── format.ts                 # formatTime, formatDuration, etc.
│   │   └── haptics.ts                # Vibration API wrapper
│   │
│   ├── services/
│   │   └── api.ts                    # Typed backend API client
│   │
│   ├── styles/
│   │   ├── index.css                 # Aggregate imports
│   │   ├── theme.css                 # CSS custom properties
│   │   ├── fonts.css                 # Plus Jakarta Sans + JetBrains Mono
│   │   └── tailwind.css              # Tailwind v4 config
│   │
│   ├── types/
│   │   └── index.ts                  # All TypeScript types
│   │
│   └── main.tsx                      # React entry point
│
├── ACCESSIBILITY.md                  # A11y patterns, scorecard, test checklist
├── DESIGN_SYSTEM.md                  # Tokens, Figma-ready spec sheet
├── README.md                         # ← you are here
├── index.html                        # Vite HTML entry
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vite.env.d.ts
```

---

## Tech stack

| Layer | Tool | Why |
|-------|------|-----|
| Framework | React 18 | Stable, well-supported, screen-reader-friendly |
| Language | TypeScript (strict) | Catches type errors at build time |
| Bundler | Vite 5 | Fast dev server, ESM-native, tiny prod bundle |
| Styling | Tailwind CSS v4 + custom CSS | Utility-first + design tokens |
| Animation | Motion (Framer Motion v11) | Spring physics, GPU-accelerated, reduced-motion support |
| Icons | Lucide React | Light, consistent, tree-shakeable |
| Speech | Web Speech API | Browser-native, no API keys |
| Vibration | Web Vibration API | Browser-native, no permissions needed |

No external state library (Redux/Zustand). No CSS-in-JS (Emotion/Styled).
No icon font (Material/Lucide Web Font). Just React, TypeScript, and
the browser.

---

## Available scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start dev server at <http://localhost:5173> |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npx tsc --noEmit` | Type-check without emitting (what CI runs) |

---

## Available CI checks (in `.github/workflows/ci.yml`)

1. **Frontend (typecheck + build)** — TypeScript strict, then
   production build. Artifacts: `dist/`.
2. **Backend (Python syntax)** — quick `python -m compileall`
   smoke test on the FastAPI backend.

CI runs on every push to `main` and every pull request. No separate
Lint workflow — `tsc --noEmit` with `noUnusedLocals` covers it.

---

## Adding a new screen

1. Create `src/components/screens/MyScreen.tsx` with a default export
   of a React component that takes `{ navigate: NavFn }` as a prop.
2. Add the screen name to the `Screen` union in `src/types/index.ts`.
3. Add a label to `SCREEN_LABEL` in `src/app/App.tsx` (this is what
   TTS reads on navigation).
4. Add a case to the `renderScreen()` switch in `App.tsx`.
5. (Optional) Add help text to `SCREEN_HELP` in
   `src/hooks/useScreenHelp.ts`.

The screen automatically gets:
- Global TTS announcement on entry
- Persistent help button
- AnimatePresence transitions
- Lazy loading (only 3 screens are eager)
- Back navigation via `navigate(prev)` where `prev` is the previous
  screen in the natural flow

---

## Accessibility patterns

See **[ACCESSIBILITY.md](./ACCESSIBILITY.md)** for the full
scorecard, 10 core patterns, per-screen notes, and testing
checklist.

Highlights:
- **Auto-TTS** via `App.tsx` global screen-change handler +
  per-screen `useEffect`.
- **Vibration API** via `lib/haptics.ts` (`haptic.tap()`,
  `haptic.select()`, `haptic.success()`, `haptic.warning()`).
- **Skip-to-content** via `Accessibility.tsx` (WCAG 2.4.1).
- **Persistent help** via `PersistentHelpButton.tsx` (a floating
  "Where am I?" button on every content screen).
- **Reduced motion** via `useReducedMotion()` from Motion.

---

## Design system

See **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** for the full
token reference, Figma-ready spec sheet (text styles, color
styles, effect styles, components to build, recommended
plugins).

Aesthetic: **"Ethereal Glass"** — deep OLED backgrounds, restrained
glass surfaces, indigo→emerald accents, editorial type scale.

---

## Environment / backend connection

The frontend expects the FastAPI backend to be reachable at the URL
configured in `src/services/api.ts:27`. Default is the hard-coded
production URL.

To use a local backend, change `API_BASE` in `api.ts` or wire it up
to a `VITE_API_URL` environment variable (the env var plumbing is
left as a 1-line change for the user).

---

## Project values

1. **Accessibility is non-negotiable.** Every screen, every
   interaction, every error path is designed for the user who
   cannot see the UI. If a feature is "nice to have" but breaks
   accessibility, we cut it.
2. **Premium feel for everyone.** Blind users deserve the same
   quality of UI as sighted users. The same glassmorphism, the
   same spring physics, the same massive type.
3. **No silent failures.** Every action has a confirmation
   (visual, audio, haptic). Every error has a recovery path.
4. **The mic is the largest element.** Always. This is a
   voice-first app. The mic should never be smaller than any
   other touchable element.
5. **Ship clean.** No `any` types. No `console.log` in prod. No
   dead code. CI must always be green.

---

## License

Internal hackathon project. All rights reserved.
