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

- No type assertions (`as`, `!`) ever
- Infer types from usage when possible
- Prefer discriminated unions over optional props
- Use generics meaningfully, not excessively

## Validation

After making changes, run:

```bash
npm run typecheck  # Type check (tsgo)
npm run lint       # oxlint + content validation
npm run fmt        # oxfmt (format) — or `fmt:check` to verify only
```

Fix all errors before considering work complete.

## Formatting (oxfmt)

Formatting uses **oxfmt** (`.oxfmtrc.json`), the Oxc formatter, not Prettier. Style: no semicolons, single quotes, trailing commas, 80-column width. Don't hand-format — run `npm run fmt`.

## Linting (oxlint)

- Avoid `oxlint-disable` / `eslint-disable` comments; a rare justified exception must include a `-- reason` justification
- Never silence warnings or errors without a documented reason
- Fix the root cause instead
- Solid rules come from `eslint-plugin-solid` loaded via oxlint's `jsPlugins`

## Components

- Extract reusable components, avoid one-off inline JSX
- Use composition over prop soup (children, slots, render props)
- Keep components focused and single-purpose
