---
name: Developer Experience & Tooling
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - tsconfig.json
  - package.json
  - src/env.ts
overview: >
  Strict TypeScript with tsgo for fast typechecking, zero-tolerance ESLint policy,
  Zod-validated environment variables, and content validation integrated into the
  lint pipeline.
---

# Developer Experience & Tooling

> **Status**: Implemented (February 2026).

## Context

The project prioritizes catching errors at build time over runtime. The tooling choices reflect a "strict by default" philosophy where the type system and linters enforce correctness, and developer convenience comes from fast feedback loops rather than loose checks.

## Decision

### TypeScript: Strict Mode + tsgo

TypeScript runs in strict mode with additional lint-level checks:

- `strict: true` — enables all strict type-checking options
- `noUnusedLocals` / `noUnusedParameters` — no dead code
- `noFallthroughCasesInSwitch` — explicit case handling
- `verbatimModuleSyntax` — enforces explicit type imports
- `noUncheckedSideEffectImports` — catches import side-effect issues

Typechecking uses **tsgo** (`@typescript/native-preview`) — the native TypeScript compiler rewrite. It's significantly faster than `tsc` for iterative development. The `typecheck` script runs `tsgo --noEmit`.

A zero-tolerance assertion policy applies: no `as` casts, no `!` non-null assertions. Types are inferred from usage or explicitly annotated — never forced. This is enforced socially (via AGENTS.md and code review) rather than with a lint rule.

### ESLint: No Escape Hatches

ESLint is configured with TanStack's shared config, Solid.js rules, and import ordering. The policy is:

- Never use `eslint-disable` comments
- Never silence warnings or errors
- Fix the root cause instead

This keeps the linter output trustworthy — if it reports zero errors, the codebase is clean.

### Environment Variables: Typed with @t3-oss/env-core

`src/env.ts` uses `@t3-oss/env-core` to define server and client environment variables with Zod schemas. The `VITE_` prefix convention is enforced at both the type level and runtime. Empty strings are treated as undefined (`emptyStringAsUndefined: true`), preventing subtle bugs with unset env vars.

### Content Validation in Lint Pipeline

`npm run lint` runs both ESLint and `scripts/validate-content.ts`. This means CI catches:

- TypeScript type errors (via `typecheck`)
- Code quality issues (via `lint` → ESLint)
- Content/schema drift (via `lint` → `validate-content`)

All three must pass before work is considered complete.

## Consequences

- Fast feedback: tsgo typechecks in a fraction of the time tsc takes
- High confidence: strict types + zero-assertion policy means runtime type errors are rare
- Content safety: broken CMS content is caught in CI, not in production
- Higher bar for contributors: the strict policies require familiarity with TypeScript's type system

## Revision History

- **2026-02-16** (Michael): Initial document capturing DX and tooling decisions
