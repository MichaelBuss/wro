# Code Review Guidelines

## No lint or TypeScript suppression comments

Check for `// eslint-disable`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck` comments. These should be removed and the underlying issue fixed properly.

**References:** `.cursor/skills/typescript-style/SKILL.md`

## No type assertions

Check for `as SomeType` usage (excluding `as const`). TypeScript errors should be resolved with proper typing, narrowing, or Zod validation — not cast away.

**References:** `.cursor/skills/typescript-style/SKILL.md` — "Type Assertions and `any`"

## Avoid duplicating reusable components and utilities

Check if new components, hooks, or utility functions already exist. Before adding anything, search:

- `src/components/` for UI primitives
- `src/lib/utils.ts` for typed utilities (`nonNullable`, `objectEntries`, `DistributiveOmit`, etc.)
- Kobalte UI for accessible interactive primitives

**References:** `AGENTS.md` — "Reuse First"

## Custom classes are for positioning only; use CVA variants

Check for custom CSS classes or inline styles on components that override appearance (colors, typography, spacing on text). Components should be extended through their variant props. Only layout/positioning classes (margin, width, positioning) are acceptable via `class`.

**References:** `.cursor/skills/solid-style/SKILL.md` — "Styling with CVA and Tailwind"

## Solid.js reactivity correctness

Check for common Solid.js mistakes that silently break reactivity:

- Destructured props outside JSX/reactive contexts
- `&&` used for conditional rendering (renders `0` for falsy numbers)
- `array().map()` in JSX instead of `<For>`
- `createEffect` used to derive values instead of `createMemo`

**References:** `.cursor/skills/solid-style/SKILL.md`
