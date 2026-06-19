# Wayfinder AI — Design System

> Single source of truth for all visual design. Implemented in
> `src/design-system/tokens.ts` + `src/styles/theme.css`. All
> components consume these tokens — no hard-coded values.

## Aesthetic

**"Ethereal Glass"** — deep OLED backgrounds, restrained glass
surfaces, indigo→emerald accent gradients, editorial type scale.

Inspired by:
- Linear (premium dark mode, generous whitespace, mono accents)
- Notion (clear hierarchy, calm interaction)
- Apple Wallet (large type, clear CTAs, premium feel)
- Google Maps (clear wayfinding, status badges)

## Color

### Background (layered OLED blacks)
```
bg-deepest   #050608   page-level
bg-deep      #0B1020   screen-level
bg-surface   #0F1428   slightly lifted
bg-raised    #151B33   cards
```

### Foreground (WCAG AA+ on bg.deep)
```
fg-primary    #FFFFFF              primary text (contrast 17:1)
fg-secondary  rgba(255,255,255,0.78)  secondary text (contrast 13:1)
fg-tertiary   rgba(255,255,255,0.54)  tertiary (contrast 9:1)
fg-muted      rgba(255,255,255,0.36)  muted (contrast 6:1)
```

### Brand
```
indigo-500   #6366F1   primary
indigo-600   #4F46E5   primary dark
emerald-500  #22C55E   success
emerald-600  #16A34A   success dark
```

### Semantic
```
success  #22C55E
warning  #F59E0B
danger   #EF4444
info     #06B6D4
```

### Gradients
```css
grad-primary   linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%)
grad-success   linear-gradient(135deg, #16A34A 0%, #22C55E 50%, #10B981 100%)
grad-danger    linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)
grad-brand     linear-gradient(135deg, #4F46E5 0%, #7C3AED 33%, #22C55E 66%, #10B981 100%)
grad-halo      radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, rgba(34,197,94,0.10) 40%, transparent 70%)
```

## Typography

Editorial-feeling scale. Body is 16-18px (larger than typical 16px)
for low-vision users.

```
displayLg  60px  /  1.04  /  800  /  -0.04em   hero only
display    48px  /  1.08  /  800  /  -0.035em
displaySm  36px  /  1.12  /  800  /  -0.03em
h1         30px  /  1.20  /  800  /  -0.025em
h2         24px  /  1.25  /  700  /  -0.02em
h3         20px  /  1.30  /  700  /  -0.015em
h4         18px  /  1.40  /  700  /  -0.01em
bodyLg     18px  /  1.55  /  500
body       16px  /  1.60  /  500
bodySm     15px  /  1.55  /  500
label      14px  /  1.40  /  700
labelSm    13px  /  1.40  /  700
eyebrow    11px  /  1.40  /  700  /  +0.18em   uppercase
caption    12px  /  1.40  /  600
```

**Font stack:**
```css
font-sans:  "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, Inter, sans-serif
font-mono:  "JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace
```

## Spacing (4-pt grid)

```
0   0
1   4
2   8
3   12
4   16
5   20
6   24
7   28
8   32
10  40
12  48
16  64
20  80
24  96
32  128
40  160
```

## Border radius

```
xs    6
sm    8
md    12
lg    16
xl    20
2xl   24    /* default card */
3xl   32
4xl   40
pill  9999px /* round buttons */
```

## Elevation

```
elev-sm  0 1px 2px rgba(0,0,0,0.32), 0 1px 1px rgba(0,0,0,0.18)        slightly lifted
elev-md  0 4px 12px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.20)       standard
elev-lg  0 12px 36px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.24)       floating
elev-xl  0 24px 60px rgba(0,0,0,0.52), 0 6px 16px rgba(0,0,0,0.28)      modal
glow-primary  0 12px 36px rgba(99,102,241,0.45), 0 4px 12px rgba(79,70,229,0.32)
glow-success  0 12px 36px rgba(34,197,94,0.45), 0 4px 12px rgba(22,163,74,0.32)
glow-danger   0 12px 36px rgba(239,68,68,0.45), 0 4px 12px rgba(220,38,38,0.32)
inset-highlight  inset 0 1px 1px rgba(255,255,255,0.10), inset 0 -1px 1px rgba(0,0,0,0.18)
```

## Motion

### Duration
```
instant  100ms
fast     180ms
base     260ms
slow     420ms
slower   600ms
```

### Easing (custom cubic-beziers — no generic ease-in-out)
```
standard  cubic-bezier(0.32, 0.72, 0, 1)    default — natural
spring    cubic-bezier(0.34, 1.56, 0.64, 1)  snappy entry, slight overshoot
exit      cubic-bezier(0.55, 0, 0.7, 0.2)    confident exit
in        cubic-bezier(0.16, 1, 0.3, 1)     smooth deceleration
out       cubic-bezier(0.7, 0, 0.84, 0)     smooth acceleration
```

### Spring (for Motion library)
```
default  { type: "spring", stiffness: 280, damping: 28 }
gentle   { type: "spring", stiffness: 200, damping: 26 }
bouncy   { type: "spring", stiffness: 380, damping: 18 }   celebrations
snappy   { type: "spring", stiffness: 500, damping: 32 }   quick interactions
```

## Touch targets

```
min         44px  WCAG AAA minimum
preferred   56px
hero        72px  primary CTAs
mic        120px  standard mic
mic-hero   140px  hero mic
```

## Z-index (systemic only)

```
base       0
raised    10
sticky    20
header    30
overlay   40
modal     50
toast     60
tooltip   70
```

---

## Component patterns

### The Doppelrand (Double-Bezel) card

Every premium card uses nested enclosures — an outer shell + inner
core — to look like physical machined hardware.

```tsx
<Card variant="default" padding="md">
  <div style={{
    background: tokens.color.glass.fill,             // inner core bg
    borderRadius: 'calc(2rem - 0.375rem)',           // concentric curves
    boxShadow: tokens.elevation.insetHighlight,      // inner highlight
    backgroundImage: tokens.gradient.glassShine,     // glass shine overlay
  }}>
    {/* content */}
  </div>
</Card>
```

The outer card has:
- Subtle background tint (`bg-white/[0.04]`)
- Hairline border (`border-white/[0.08]`)
- Large outer radius (24px)
- Optional glow shadow (variants: success / danger / tinted)

### The Button-in-Button trailing icon

Primary buttons have the trailing icon nested in its own circular
wrapper. The wrapper animates diagonally on hover, creating internal
kinetic tension.

```tsx
<Button variant="primary" icon={<ArrowRight size={22} />}>
  Get started
</Button>
```

Renders as:
```
[ Get started (→) ]
        └─ nested circle around arrow, scales + translates on hover
```

### Spring `whileTap` for tactile feedback

Every interactive element gets a spring scale-down on press:

```tsx
<motion.button whileTap={{ scale: 0.97 }}>
```

The `useReducedMotion()` hook returns true if the user prefers
reduced motion, in which case `whileTap` is skipped entirely.

---

## Figma spec sheet

Want to recreate this in Figma? Here's the import list:

### Text styles
| Figma text style | Spec |
|------------------|------|
| Display/Large | Plus Jakarta Sans ExtraBold 60 / 62 |
| Display | Plus Jakarta Sans ExtraBold 48 / 52 |
| H1 | Plus Jakarta Sans ExtraBold 30 / 36 |
| H2 | Plus Jakarta Sans Bold 24 / 30 |
| H3 | Plus Jakarta Sans Bold 20 / 26 |
| H4 | Plus Jakarta Sans Bold 18 / 25 |
| Body/Large | Plus Jakarta Sans Medium 18 / 28 |
| Body | Plus Jakarta Sans Medium 16 / 26 |
| Label | Plus Jakarta Sans Bold 14 / 20 |
| Eyebrow | Plus Jakarta Sans Bold 11 / 14, +0.18em tracking, UPPER |
| Caption | Plus Jakarta Sans SemiBold 12 / 16 |
| Mono/Reference | JetBrains Mono ExtraBold 32 / 36, +0.04em tracking |

### Color styles
| Figma color | Token | Value |
|-------------|-------|-------|
| Background/Deepest | bg.deepest | #050608 |
| Background/Deep | bg.deep | #0B1020 |
| Background/Surface | bg.surface | #0F1428 |
| Background/Raised | bg.raised | #151B33 |
| Foreground/Primary | fg.primary | #FFFFFF |
| Foreground/Secondary | fg.secondary | rgba(255,255,255,0.78) |
| Foreground/Tertiary | fg.tertiary | rgba(255,255,255,0.54) |
| Foreground/Muted | fg.muted | rgba(255,255,255,0.36) |
| Brand/Indigo-500 | brand.indigo500 | #6366F1 |
| Brand/Indigo-600 | brand.indigo600 | #4F46E5 |
| Brand/Indigo-300 | brand.indigo300 | #A5B4FC |
| Brand/Emerald-500 | brand.emerald500 | #22C55E |
| Brand/Emerald-600 | brand.emerald600 | #16A34A |
| Semantic/Success | semantic.success | #22C55E |
| Semantic/Warning | semantic.warning | #F59E0B |
| Semantic/Danger | semantic.danger | #EF4444 |
| Border/Subtle | border.subtle | rgba(255,255,255,0.06) |
| Border/Default | border.default | rgba(255,255,255,0.10) |
| Border/Strong | border.strong | rgba(255,255,255,0.18) |

### Effect styles
| Figma effect | Spec |
|--------------|------|
| Elevation/SM | Drop shadow 0 1 2 rgba(0,0,0,0.32) + 0 1 1 rgba(0,0,0,0.18) |
| Elevation/MD | Drop shadow 0 4 12 rgba(0,0,0,0.32) + 0 1 2 rgba(0,0,0,0.20) |
| Elevation/LG | Drop shadow 0 12 36 rgba(0,0,0,0.42) + 0 2 8 rgba(0,0,0,0.24) |
| Elevation/XL | Drop shadow 0 24 60 rgba(0,0,0,0.52) + 0 6 16 rgba(0,0,0,0.28) |
| Glow/Primary | Drop shadow 0 12 36 rgba(99,102,241,0.45) + 0 4 12 rgba(79,70,229,0.32) |
| Glow/Success | Drop shadow 0 12 36 rgba(34,197,94,0.45) + 0 4 12 rgba(22,163,74,0.32) |
| Glow/Danger | Drop shadow 0 12 36 rgba(239,68,68,0.45) + 0 4 12 rgba(220,38,38,0.32) |
| Glass/Inset | Inner shadow 0 1 1 rgba(255,255,255,0.10) + 0 -1 1 rgba(0,0,0,0.18) |

### Components to build
- Button (5 variants × 5 sizes = 25 instances)
- Card (5 variants × 5 paddings)
- Input (3 sizes)
- VoiceMicButton (3 sizes)
- VoiceWave (3 sizes)
- BottomNav (4 tabs)
- ScreenHeader (back + title + right slot)
- SkipToContent
- PersistentHelpButton (with popover)

### Recommended Figma plugins
- Iconify (lucide-react)
- Stark (contrast checker)
- A11y — Color Contrast Checker
- Design Tokens (for the tokens file)
- Stark — Accessibility Annotations

---

## Files

- `src/design-system/tokens.ts` — TypeScript tokens (consumed in code)
- `src/styles/theme.css` — CSS custom properties (consumed in CSS)
- `src/styles/fonts.css` — Google Fonts import (Plus Jakarta Sans, JetBrains Mono)
- `src/styles/tailwind.css` — Tailwind v4 config
- `src/styles/index.css` — aggregate imports

## Updating tokens

When changing a token:
1. Update `tokens.ts` (the source of truth)
2. The matching CSS variable in `theme.css` will diverge from JS — keep them in sync
3. All components consume via `import { tokens, type } from "../../design-system"`
4. Verify CI: typecheck + build
5. Push — every commit triggers a GitHub Actions run
