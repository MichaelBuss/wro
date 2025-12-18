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
npx tsc --noEmit  # Type check
npm run lint      # ESLint
```

Fix all errors before considering work complete.

## ESLint

- Never use `eslint-disable` comments
- Never silence warnings or errors
- Fix the root cause instead

## Components

- Extract reusable components, avoid one-off inline JSX
- Use composition over prop soup (children, slots, render props)
- Keep components focused and single-purpose
