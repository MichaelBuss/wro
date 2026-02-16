---
name: Component & UI System
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - src/components/
  - src/cva.config.ts
relatedPlans:
  - styling-and-theming
  - tech-stack-and-framework
overview: >
  Component system built on Kobalte headless primitives, CVA for variant-driven
  styling, and modern web platform APIs (Popover, CSS Anchor Positioning,
  Invoker Commands, Dialog Light Dismiss) to minimize JavaScript state management.
---

# Component & UI System

> **Status**: Implemented (February 2026).

## Table of Contents

1. [Problem / Context](#problem--context)
2. [Decision](#decision)
3. [Component Organization](#component-organization)
4. [Kobalte + CVA](#kobalte--cva)
5. [Platform-First Interactive Patterns](#platform-first-interactive-patterns)
6. [Layout Composition](#layout-composition)
7. [Alternatives Considered](#alternatives-considered)
8. [Revision History](#revision-history)

## Problem / Context

The site needs standard interactive UI: navigation dropdowns, a mobile drawer, carousels, buttons with variants, and content cards. These need to be accessible, performant, and maintainable without pulling in a heavy component library.

## Decision

Three principles guide the component system:

1. **Kobalte for accessible primitives** — headless components that handle ARIA, keyboard navigation, and focus management
2. **CVA for variant-driven styling** — type-safe variant definitions with Tailwind class merging
3. **Native web APIs over JavaScript state** — use Popover API, CSS Anchor Positioning, Invoker Commands, and Dialog Light Dismiss wherever possible

## Component Organization

```
src/components/
├── nav/           # Navigation: Header, NavLink, NavDropdown, MobileDrawer, Logo
├── layout/        # Page structure: InfoPageLayout, PageHeader, BackLink
├── ui/            # Reusable primitives: Button, ContentCard, TipBox
├── carousel/      # Carousel, CarouselNav, NavArrow, NavDot
├── Header.tsx     # Top-level header (composes nav/ components)
└── InfoTopicCard.tsx
```

Components are grouped by domain (nav, layout, carousel) rather than by abstraction level. The `ui/` folder holds the most reusable, context-free primitives.

## Kobalte + CVA

**Kobalte** provides headless, accessible component primitives for Solid.js. The Button component demonstrates the pattern:

```typescript
// Kobalte handles accessibility, CVA handles styling
const Button = (props) => (
  <ButtonPrimitive.Root
    class={buttonVariants({ variant: local.variant, size: local.size })}
    {...others}
  />
)
```

**CVA** (Class Variance Authority) defines typed variant maps. Combined with `tailwind-merge` (configured in `src/cva.config.ts`), it resolves conflicting Tailwind classes cleanly:

```typescript
const { cva, cx, compose } = defineConfig({
  hooks: { onComplete: (className) => twMerge(className) },
})
```

This gives components a consistent API: `variant` and `size` props that map to predefined class sets, with the ability to override via `class`.

## Platform-First Interactive Patterns

Where browser APIs can replace JavaScript state management, they're preferred. This reduces bundle size, improves performance, and aligns with progressive enhancement.

### Popover API + CSS Anchor Positioning (NavDropdown)

The desktop navigation dropdown uses the Popover API for show/hide and CSS Anchor Positioning for placement — no JavaScript positioning library needed:

```typescript
// Popover API handles toggle state
triggerRef.popoverTargetElement = popoverRef

// CSS Anchor Positioning handles placement
style={{ 'position-anchor': anchorName, top: 'anchor(bottom)', left: 'anchor(center)' }}
```

Entry animations use Tailwind's `starting:` variant (mapped to `@starting-style`), avoiding JavaScript animation orchestration.

### Dialog + Invoker Commands + Light Dismiss (MobileDrawer)

The mobile navigation drawer uses three modern features together:

- **`<dialog>`** for the drawer panel — gets top-layer rendering and focus trapping for free
- **Invoker Commands** (`commandfor` / `command`) for declarative open/close without state management
- **Dialog Light Dismiss** (`closedby="any"`) for click-outside-to-close behavior

A fallback click handler covers browsers that don't yet support `closedby`.

### Why Platform APIs

These APIs are standardized, progressively enhanced, and remove entire categories of JavaScript:

- No need for `createSignal` to track open/close state
- No positioning libraries (Floating UI, Popper)
- No focus trap libraries
- No click-outside detection hooks

The trade-off is browser support — some features are Chrome 134/135+. For this project that's acceptable; the site degrades gracefully in older browsers.

## Layout Composition

Info pages follow a consistent composition pattern rather than a monolithic page component:

```
InfoPageLayout
├── PageHeader (title + optional description)
├── BackLink (contextual back navigation)
├── ContentCard (styled content container)
│   └── page-specific content
└── TipBox (optional callout)
```

This keeps each piece focused and reusable. New info pages compose the same building blocks with different content.

## Alternatives Considered

**Full component library (e.g., Solid UI, Park UI).** Would provide more out-of-the-box components but limits control over styling and behavior. Kobalte's headless approach gives full styling freedom.

**No component library (pure Tailwind).** Faster to start but accessibility suffers. Kobalte handles ARIA attributes, keyboard navigation, and focus management that are easy to get wrong manually.

**Floating UI for positioning.** The standard JavaScript approach for dropdowns and tooltips. CSS Anchor Positioning achieves the same result with zero JavaScript and no layout thrashing, at the cost of newer browser requirements.

**State-managed drawers (createSignal + Portal).** The traditional SPA approach. Native `<dialog>` with Invoker Commands is less code, handles focus trapping automatically, and renders in the top layer without z-index issues.

## Revision History

- **2026-02-16** (Michael): Initial document capturing component and UI architecture
