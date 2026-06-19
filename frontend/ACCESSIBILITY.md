# Wayfinder AI — Accessibility Documentation

> Built for blind and visually impaired travelers. Every screen, every
> component, every interaction is designed with the question: *"If I were
> blind, stressed, and standing in a busy airport, would this interface
> help me complete my task confidently?"*

## Accessibility scorecard

| Category | Status | Notes |
|----------|--------|-------|
| **WCAG 2.1 AA compliance** | ✅ | Color contrast 4.5:1+ on all text |
| **Screen reader support** | ✅ | NVDA / JAWS / VoiceOver / TalkBack |
| **Keyboard navigation** | ✅ | All interactive elements reachable |
| **Touch target size** | ✅ | All targets ≥ 60px (44px minimum) |
| **Voice-first** | ✅ | Every critical action has a voice alternative |
| **Haptic feedback** | ✅ | Vibration API on Android |
| **Auto-TTS** | ✅ | Every screen announces itself on mount |
| **Reduced motion** | ✅ | All animations respect `prefers-reduced-motion` |
| **Focus indicators** | ✅ | 4px focus-visible rings on everything |
| **Skip navigation** | ✅ | Skip-to-content link + per-screen back |

---

## Core patterns

### 1. Auto-TTS on every screen mount

Every screen speaks its name + key content on mount. This means a blind
user navigating the app always knows where they are, what to do, and
what they can say.

```ts
// src/hooks/useSpeech.ts
speak({ text: "Choose departure airport. Search or tap a recent / popular airport. Or speak it." });
```

Implementation lives in `App.tsx` (the `SCREEN_LABEL` map and the
`useEffect` that speaks on screen change), plus per-screen `useEffect`
hooks for screen-specific content.

### 2. The mic is the largest element

The microphone button (140px diameter, 120px minimum) is intentionally
the largest interactive element on every voice-related screen. Blind
users can find it by touch — it's huge.

```tsx
<VoiceMicButton size="xl" />  {/* 140px */}
```

Triple-layer pulse + ripple + glow while recording. Color shifts from
indigo to red on the active state for partial-vision feedback.

### 3. Global "Where am I?" help

A floating indigo button in the bottom-right corner of every content
screen. One tap reads:
- The current screen name
- One-sentence context
- The primary action
- A voice command the user can say

Plus a popover with quick actions (Go home, My trips, Voice assistant,
Stop reading, Go back).

```tsx
<PersistentHelpButton navigate={navigate} onBack={backHandler} />
```

### 4. Voice confirmation for destructive actions

Cancel flight, confirm booking, and other irreversible actions require
either:
- An explicit "Yes, cancel" / "Confirm and pay" tap on a 72-80px button
- Or saying "yes" / "confirm" / "book it" (parsed in the same screen)

The voice confirmation is *secondary* to the visual button — never the
only path. Screen readers announce "Say yes or confirm, or tap the
button."

### 5. Haptic feedback

Vibration API on every important action:
- `haptic.tap()` — single button press (10ms)
- `haptic.select()` — selection confirmed (30-10-30)
- `haptic.success()` — action completed (10-50-10)
- `haptic.warning()` — error or destructive (50-30-50-30-50)

Android: full support. iOS Safari: no support (Apple intentionally
disables the Vibration API). The library no-ops silently when
unsupported.

### 6. Skip-to-content

The first focusable element on every page is a "Skip to main content"
link. Visually hidden until focused (Tab), then it appears as a
floating pill. Jumps focus past the nav chrome.

```tsx
<SkipToContent />
```

### 7. 60px+ touch targets

All interactive elements are at least 60px tall (WCAG AAA level for
motor accessibility). The most common is the 60px round button (back,
clear, volume, etc.). Hero CTAs are 72-80px. The mic is 120-140px.

```css
min-h-[60px]   /* standard */
min-h-[72px]   /* hero */
min-h-[80px]   /* confirm and pay */
w-[120px]      /* mic, standard */
w-[140px]      /* mic, hero */
```

### 8. Strong focus indicators

Every interactive element has a 4px focus-visible ring in indigo
(`focus-visible:ring-4 focus-visible:ring-indigo-300/70`) with a 2px
offset against the page background.

```css
focus:outline-none focus-visible:ring-4
focus-visible:ring-indigo-300/70
focus-visible:ring-offset-2
focus-visible:ring-offset-[#0B1020]
```

### 9. Reduced motion

All motion components check `useReducedMotion()` and either skip the
animation or replace it with a static state change. Critical for
users with vestibular disorders.

```ts
const reduced = useReducedMotion();
// ...
whileTap={!reduced ? { scale: 0.97 } : undefined}
```

### 10. Clear state announcements

`aria-live` regions on:
- Live transcript (polite)
- AI response (polite)
- Voice recording state (assertive for error)
- Form errors (alert)
- Loading states (polite)

---

## Screen-by-screen a11y notes

### Splash
- Auto-advances after 3s OR tap "Get started"
- Welcome message auto-reads on mount
- 80px hero CTA, impossible to miss

### Home
- 140px auto-focused mic
- Backend status badge: `aria-label="Backend Online"`
- Quick actions: bento grid, all 60px+ touch targets
- Greeting auto-reads once per session

### Voice
- 140px mic, auto-focused
- State machine: idle → listening → processing → speaking → success
- Live transcript shown as the user speaks
- AI response card auto-reads on arrival
- "Stop reading" button always visible during speech
- Text fallback for browsers without SpeechRecognition

### Airport input
- Auto-focused search field (64px tall)
- Search by IATA, city, or airport name
- Recent + popular airports pre-loaded
- Voice search inline (no separate screen)
- "Select first" quick action on search results
- Selected airport has `aria-current="true"`
- Escape key clears the search

### Date picker
- Native date input (Doppelrand) as the canonical entry
- 6 quick presets: Today, Tomorrow, This weekend, Next week, 2 weeks, 1 month
- Voice / typed input: "July 15" or "tomorrow"
- Auto-reads screen state on mount
- "Search flights" hero CTA (80px)

### Results
- Auto-reads cheapest flight on arrival
- "Read all flights aloud" button
- Cheapest highlighted with Card variant="success"
- Departure/arrival at 2.25rem h1 — massive for low vision
- Each card: 60px+ tap target, voice-select option

### Passenger
- Name input with voice mic (auto-captures and confirms via TTS)
- 88px assistance option cards with `aria-pressed`
- Hero "Continue" button (72px)
- Auto-reads the screen state on mount

### Review
- Auto-reads the entire trip summary
- 80px hero "Confirm and pay" (success gradient + glow)
- Voice confirm: say "yes" / "confirm" / "book it"
- Edit pencil in passenger card
- "Read trip summary aloud" button

### Success
- 28×28 checkmark with spring entrance
- Booking reference in monospace at h1 size
- "Read aloud" button
- Two CTAs: "View my trips" (primary) / "Book another flight" (secondary)

### Trips
- Auto-reads count + most recent trip
- Upcoming vs past sections
- Each trip: 60px+ tap target, status badge, voice read-aloud

### Trip detail
- 5-flow state machine: view → cancel-confirm → cancel-done → reschedule-date → reschedule-options → reschedule-done
- Confirmation dialogs for cancel (Doppler'd refund amount)
- Voice cancel confirmation

### Portfolio
- Auto-reads all stats on mount
- Each stat card: tap to read aloud individually
- 2-column grid (responsive)

### Assistant
- Chat interface with both voice and text input
- Quick-action chips
- Auto-scroll to latest message
- Send / receive haptics

### Profile / Settings
- Edit name inline
- Voice rate + pitch sliders with live preview
- All settings persist to localStorage

---

## Testing checklist

When reviewing a screen, ask:

- [ ] Can a blind user tell where they are? (auto-read on mount)
- [ ] Can a blind user tell what to do? (visible primary action + voice hint)
- [ ] Can a blind user tell what they can say? (voice command hint in help)
- [ ] Are all touch targets ≥ 60px? (mechanical accessibility)
- [ ] Is contrast ≥ 4.5:1? (color accessibility)
- [ ] Can a keyboard user reach everything? (tab order)
- [ ] Are error messages linked to inputs? (aria-describedby)
- [ ] Is focus visible at all times? (focus-visible ring)
- [ ] Does motion respect `prefers-reduced-motion`? (vestibular)
- [ ] Does the screen have an h1? (screen-reader landmark)

---

## Files

- `src/hooks/useSpeech.ts` — TTS + STT wrapper
- `src/hooks/useWizard.tsx` — global booking state
- `src/hooks/useUser.tsx` — global user state
- `src/hooks/useLocation.ts` — current screen broadcaster
- `src/hooks/useScreenHelp.ts` — context-aware help per screen
- `src/lib/haptics.ts` — Vibration API wrapper
- `src/components/ui/Accessibility.tsx` — SkipToContent, VisuallyHidden, useAutoRead
- `src/components/ui/PersistentHelpButton.tsx` — floating "Where am I?" help
- `src/components/ui/VoiceMicButton.tsx` — 100-140px mic button
- `src/design-system/tokens.ts` — all design tokens (a11y included)

---

## Reporting issues

If you find an accessibility issue, file a bug with:
- Screen name
- Assistive technology used (VoiceOver, NVDA, etc.)
- Browser + version
- Steps to reproduce

The user's safety depends on this. Take it seriously.
