---
name: Styling & Theming
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - src/styles.css
  - src/cva.config.ts
relatedPlans:
  - component-and-ui-system
overview: >
  Tailwind CSS v4 with CSS-first configuration, semantic design tokens for
  light/dark mode, and a custom wro-blue OKLCH palette — largely following
  Tailwind v4 conventions and defaults.
---

# Styling & Theming

> **Status**: Implemented (February 2026).

## Context

The site uses Tailwind CSS v4 with its new CSS-first configuration model. The styling approach follows Tailwind v4 conventions closely rather than inventing a custom design system.

## Decision

**Tailwind v4 CSS-first config** — no `tailwind.config.js`. All theme customization lives in `src/styles.css` via `@theme inline`, `@custom-variant`, `@utility`, and `@plugin` directives.

**Semantic design tokens** — CSS custom properties (`--background`, `--foreground`, `--primary`, etc.) switch between light and dark values via a `.dark` class. Components reference tokens (e.g., `bg-background`, `text-foreground`) instead of raw colors, making theme changes a single-place edit.

**wro-blue palette** — a custom 11-step color scale in OKLCH, defined as CSS variables and exposed to Tailwind via `@theme inline`. Used for the site's brand identity (the dark blue header, card accents, etc.).

**Custom utilities** — `@utility` directives for common grid row patterns (`grid-rows-min-fr`, `grid-rows-min-fr-min`, `grid-rows-fr-min`) and element resets for native `[popover]` and `<dialog>`.

**Dark mode** — defined via `@custom-variant dark (&:is(.dark *))`, using a class-based toggle rather than `prefers-color-scheme`. This allows explicit user control.

## Consequences

- Styling is fully colocated in CSS (no JS config file to maintain)
- The token system is compatible with shadcn-style component patterns (Kobalte + CVA components reference the same semantic tokens)
- Adding new theme variants (e.g., high-contrast) means adding a new class block with token overrides

## Revision History

- **2026-02-16** (Michael): Initial document capturing styling and theming approach
