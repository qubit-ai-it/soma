# SOMA — DESIGN.md

SOMA landing page design system, to apply to the web platform.
Principle: **product first, character second.** SOMA is the lead; Sentry accompanies.

## 1. Style rules
- Predominantly black background, white text.
- No uppercase labels (eyebrows), no supporting explanatory text, no divider lines or decorative borders.
- Surfaces separated by a change of tone, never by strokes.
- Text in English. No medical claims, clinical certifications or NASA endorsement.
- Real, historical and synthetic data always distinguishable.

## 2. Color (tokens)
| Token | Value | Use |
|---|---|---|
| background | oklch(0 0 0) — #000 | General background |
| foreground | oklch(1 0 0) — #FFF | Text |
| card | oklch(0.17 0 0) | Cards, product window |
| secondary | oklch(0.24 0 0) | Card hover/focus, F0–F3 tiles |
| muted | oklch(0.12 0 0) | Sidebar, project section |
| muted-foreground | oklch(0.9 0 0) | Secondary text |
| ink | oklch(0.74 0.015 265) — #A8ADB8 | Cool gray |
| accent | oklch(0.52 0.22 264) | Blue derived from Sentry |
| signal | oklch(0.72 0.13 250) | Signal dots / charts |
| accent-soft | oklch(0.22 0.03 264) | Accent backgrounds |
| primary | white, black text | Primary buttons |
| ring | white | Focus ring |

Always use semantic tokens; never hardcoded colors in components.

## 3. Typography
- Headings: **DM Sans** 700. Text: Inter (system as fallback).
- Display: 64px / 1.06 (72px ≥1440px, 32px mobile).
- Headline: 48px / 1.1 (36px mobile).
- Letter-spacing 0. Buttons in DM Sans 600.

## 4. Spacing and shape
- Container: max 1280px, side padding clamp(20px, 4vw, 64px).
- Radii: 4 / 8 / 16 / 24px. Cards and windows: 8px. Buttons: pill (9999px).
- Product shadow: 0 18px 55px -20px, white at 14%.

## 5. Components
- **Product window:** card, 8px radius, 124px sidebar (hidden on mobile). It is illustrative: mark "Demo" and "Source / Synthetic".
- **Charts:** no lines or grids; 24 dots of 7px in the signal color, with aria-label.
- **Gallery:** horizontal carousel with scroll-snap (start), 343×395px cards, 12px gap, no arrows. Hover/focus → secondary. Each card opens its reading page.
- **Reading view:** black background, white title, body at 90% white, surface oklch(0.17 0 0). Close with the button or Escape and return to the same card.
- **F0–F3 tiles:** secondary background, no border. Rules defined by the project.

## 5.1 Icons
- Single library: **Material Symbols Outlined** (`material-symbols` package, font ligatures).
- Never use text symbols (←, ↑, ↓, →, ×) or other icon libraries.
- Use the `Icon` component (`shared/ui/icon.tsx`): `<Icon name="arrow_back" />`. Decorative, `aria-hidden`; the meaning goes in the adjacent text.
- Size 1.25em by default; inherits the text color.

## 5.2 Application guidelines on the platform
- States with semantic tokens, never hardcoded colors: `ok` (All good / Nominal), `warn` (Possible risk / Watch), `danger` (Risky / Review). Background at 15% of the same color.
- AI risk on a blue scale (`accent-soft`, `accent`, `signal`) so it is not confused with the states above.
- Cards by change of tone (`card`, hover/focus `secondary`); no borders or dividers. Tables: alternating `muted` rows.
- Tabs and chips as pills; active = `primary`.
- Metrics: label in `ink`, value in DM Sans 700.
- Note or notice text in `ink`; "Demo", "Source" and "non-clinical" notices always visible wherever there is data.
- Page titles: `text-display`; sections: `text-headline`.
- Fixed dark theme; there is no light mode.

## 6. Sentry
- Use only the official `soma.riv` file ("Artboard 1" artboard, MascotController with no inputs) with the official Rive runtime.
- Never recreate, redraw or recolor. Do not invent animations.
- Automatic cycle: idle → thinking → listening → working → success → rest → warning → error → sleeping; blinking continues.
- Companion size (~140px desktop, ~65px mobile). Pause when off-screen.
- Static PNG fallback if loading fails or with reduced motion.

## 7. Loading screen
- Black background with animated Sentry in the center.
- Minimum 1.4s, maximum 8s; fades out in 400ms.
- Only once per visit, not when navigating between internal pages.

## 8. Motion
- Editorial easing: cubic-bezier(0.22, 1, 0.36, 1). Never bounces.
- Durations: micro 0.18s, fast 0.28s, normal 0.52s, reveal 0.68s.
- Maximum appearance offset: 24px.
- Appears once when ~25% is visible (bottom margin -15%); elements at the end of the document with no margin.
- Headline word by word; slight parallax in the product view; gallery cards gain opacity/scale when brought to the front.
- Reduced motion: only a 0.16s fade, no movement.
- Without JavaScript all content must be readable.

## 9. Accessibility
- Visible focus always (white ring), wins over effects.
- Keyboard navigation in the gallery; Escape closes readings.
- No horizontal overflow at 390px.
