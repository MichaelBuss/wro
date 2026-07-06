# Project Instructions

## Tech Stack

- Solid.js (not React) with TypeScript
- TanStack Solid Router, Query, Form, Start
- Tailwind CSS v4, Kobalte UI, CVA for variants
- Zod for validation

## Routing

TanStack Router uses file-based routing in `src/routes/`. Route types are auto-generated in `routeTree.gen.ts`. Never edit generated files.

## TypeScript

Write TypeScript as if Matt Pocock is reviewing:

- No type assertions (`as`, `!`) — ever. `as const` is the only exception.
- No `any` — use the proper type, or `unknown` validated with Zod.
- No `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- Infer types from usage when possible.
- Prefer discriminated unions over optional props.
- Use generics meaningfully, not excessively.

See `.cursor/skills/typescript-style/SKILL.md` for the full style guide.

## Solid.js

This is Solid.js, not React. The mental model is fundamentally different.

- Use `createSignal` for reactive state, `createMemo` for derived values, `createEffect` for side effects only.
- **Never destructure signals** — accessing `props.value` or `signal()` inside JSX is what creates the reactive subscription. Destructuring breaks reactivity.
- Use `<Show>`, `<For>`, `<Switch>/<Match>` for conditional/list rendering — never `&&` (returns `0` when falsy, not nothing) or deeply nested ternaries.
- Side effects belong in `createEffect`, not derived from signals or computed inline.
- `<For>` over `array.map()` in JSX — it's keyed and optimised for Solid's fine-grained reactivity.

See `.cursor/skills/solid-style/SKILL.md` for the full style guide.

## Reuse First

Before creating a new component, hook, or utility — search the codebase first.

- Check `src/components/` for UI primitives before building a new one.
- Check `src/lib/utils.ts` for utilities (`nonNullable`, `objectEntries`, `DistributiveOmit`, etc.).
- Use Kobalte UI for accessible interactive primitives (dialogs, popovers, toggles) — don't rebuild from scratch.
- Use CVA variants to extend existing component styles — don't write one-off CSS.

## File & Naming Conventions

- **kebab-case** for all file names (`my-component.tsx`, `use-auth.ts`).
- **Named exports only** — no default exports, ever.
- **One component per file** — co-locate its spec file alongside it (`my-component.spec.ts`).
- `.tsx` extension for any file containing JSX.

## ESLint

- Never use `eslint-disable` comments.
- Never silence warnings or errors.
- Fix the root cause instead.

## Components

- Extract reusable components, avoid one-off inline JSX.
- Use composition over prop soup (children, slots, render props).
- Keep components focused and single-purpose.
- Use CVA + `twMerge` for variants; `class` props are only for positioning/layout — never appearance.

## Images

Content editors upload images through the CMS at `/cms`, which optimizes them to WebP in the browser before committing to `public/uploads/`. For batch-adding images from the terminal (e.g. migrating existing files), use:

```bash
npm run images:optimize path/to/photo1.jpg path/to/photo2.jpg
# Outputs: public/uploads/photo1.webp, public/uploads/photo2.webp
```

This applies the identical transformation (WebP, quality 85, max 2048px) defined in `scripts/image-settings.ts`, which is the single source of truth shared with the CMS config (`public/cms/config.yml`).

## Validation

After making changes, always run:

```bash
npm run typecheck  # Type check (tsgo)
npm run lint       # ESLint + content validation
```

For changes to routes, loaders, or SSR config, also run:

```bash
npm run build
```

Fix all errors before considering work complete.
