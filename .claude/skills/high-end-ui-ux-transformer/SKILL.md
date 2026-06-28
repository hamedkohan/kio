---
name: high-end-ui-ux-transformer
description: Transform an existing UI into a high-end, premium-grade product experience. Use when the user wants to elevate, polish, refine, or "make it look expensive / world-class / Apple-grade / production-ready" — covering design tokens, typography, spacing rhythm, color, elevation, motion, micro-interactions, accessibility, and responsive/RTL behavior.
---

# High-End UI/UX Transformer

A systematic methodology for taking a functional-but-plain interface and elevating it to a
premium, cohesive, production-grade product experience — without rewriting the app.

Work **token-first and incrementally**. Never regress accessibility, semantics, or RTL support
in pursuit of visual polish. Measure before and after with screenshots.

## When to use

- "Make this look high-end / premium / world-class / expensive."
- "Polish the UI", "refine the design", "tighten the visual hierarchy."
- "This feels generic / amateur / unfinished — fix it."
- Establishing or hardening a design-token system.

## Operating principles

1. **Tokens are the source of truth.** Visual changes go through CSS variables / a token layer,
   never as one-off magic numbers in components. Find the existing token file first
   (e.g. `design-tokens.css`, a theme object, Tailwind config) and extend it.
2. **Hierarchy over decoration.** High-end design reads clearly: one primary action per view,
   deliberate type scale, generous whitespace. Add restraint, not ornament.
3. **Consistency compounds.** A handful of radii, shadows, and spacing steps applied
   *everywhere* looks more expensive than many bespoke values.
4. **Motion is feedback, not flair.** 120–240ms ease-out transitions on state changes;
   respect `prefers-reduced-motion`.
5. **Verify, don't assume.** Screenshot before/after at desktop + mobile widths, in every
   theme and text direction the app supports.

## Workflow

### 1. Audit
- Identify the stack (CSS modules, Tailwind, styled-components, plain CSS) and the token file.
- Capture baseline screenshots of key screens at ~1440px and ~390px widths.
- List the visual-debt offenders: inconsistent spacing, ad-hoc colors, flat/heavy shadows,
  weak type hierarchy, cramped or unaligned layouts, missing hover/focus/disabled states.

### 2. Establish / refine the foundation (tokens)
Define or tighten these scales, then route components through them:

- **Type scale** — modular (e.g. 1.2–1.25 ratio): caption / body / lead / h3 / h2 / h1,
  each with paired `line-height` and `letter-spacing`. Tighten tracking on large headings,
  loosen on all-caps eyebrows.
- **Spacing scale** — a single geometric/linear ramp (4px base). Use it for padding, gaps,
  and margins; kill arbitrary values.
- **Radii** — a small set (sm/md/lg/xl/pill). Nest consistently (inner radius ≈ outer − padding).
- **Elevation** — layered, low-opacity, color-tinted shadows (tint toward the ink color, not pure
  black) at xs/sm/md/lg. Premium shadows are *soft and large*, not dark and tight.
- **Color** — neutral ink ramp + tinted surfaces + restrained accents + semantic
  (good/pending/attention/danger) pairs (a 700 text + 100 background per status).

### 3. Apply layer by layer
Refine in this order so each pass builds on a stable base:

1. **Surfaces & layout** — backgrounds, cards, dividers, container max-widths, grid alignment.
2. **Typography** — apply the type scale; fix hierarchy and measure (45–75ch line length).
3. **Color & semantics** — replace raw hex with tokens; ensure status colors are consistent.
4. **Depth & borders** — apply elevation tokens; prefer 1px hairline borders + soft shadow
   over heavy outlines.
5. **Interactive states** — every actionable element gets hover, active, focus-visible, and
   disabled states. Focus rings must be visible and token-driven.
6. **Motion & micro-interactions** — transitions on color/transform/opacity; subtle lift on
   hover; skeletons over spinners for loading.

### 4. Polish details (the "expensive" signal)
- Optical alignment of icons to text baselines; consistent icon stroke width.
- Crisp 1px borders (`border` not `outline` for layout); avoid sub-pixel blur.
- Tabular numerals for data/metrics; never let numbers jitter.
- Empty, loading, and error states designed — not afterthoughts.
- Hover affordances on anything clickable; cursor correctness.
- Generous, consistent padding inside interactive controls (min 44px touch targets).

### 5. Accessibility & responsiveness (non-negotiable)
- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI boundaries.
- Keyboard reachable; visible `:focus-visible` everywhere.
- Honor `prefers-reduced-motion` and `prefers-color-scheme` if themed.
- Test every breakpoint and **both LTR and RTL** if the app is localized — use logical
  properties (`margin-inline`, `padding-inline`, `inset-inline`) instead of left/right.

### 6. Verify
- Re-screenshot the same screens/widths/themes/directions; diff against baseline.
- Run the build / typecheck (`npm run build`) to confirm no regressions.
- Confirm no hard-coded values crept in outside the token layer.

## Project-specific notes (kio)

This repo already has a strong foundation — **extend it, don't replace it**:
- Tokens live in `src/design-tokens.css` (`--kio-*`: ink/surface/accent ramps, `--kio-space-*`,
  `--kio-radius-*`, `--kio-shadow-*`, `--kio-focus`). Add new scale steps here.
- Component styles live in `src/styles.css` (and a legacy `:root` alias block). Prefer the
  `--kio-*` tokens; reconcile the older aliases (`--ink`, `--accent`, `--shadow`) toward them.
- The app is **bilingual EN/FA with RTL** (`body[data-locale]`, locale-prefixed routes). Every
  change must work in Persian/RTL — use logical CSS properties.
- Accent themes are swapped via `.accent-*` classes — keep new work theme-aware.
- Verify with `npm run dev`, and `npm run build` before committing. Screenshot LTR + RTL.

## Anti-patterns

- Sprinkling `box-shadow`/`px` values directly in components instead of tokens.
- Pure-black shadows, harsh borders, or many slightly-different grays.
- Animating layout-triggering properties (width/height/top) instead of transform/opacity.
- Removing focus outlines for looks. Replace them with a better ring — never delete.
- "Polishing" by adding gradients/glassmorphism everywhere. Restraint reads as premium.
- Breaking RTL by hard-coding left/right.
