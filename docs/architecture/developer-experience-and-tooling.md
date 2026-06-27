---
name: Developer Experience & Tooling
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-06-27
codeAnchors:
  - tsconfig.json
  - package.json
  - .oxlintrc.json
  - .oxfmtrc.json
  - src/env.ts
overview: >
  Strict TypeScript with tsgo for fast typechecking, zero-tolerance oxlint policy,
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

### oxlint: No Escape Hatches

Linting uses **oxlint** (`.oxlintrc.json`) — the Rust-based linter from the Oxc project — which runs in a fraction of the time ESLint takes. The `correctness` category is enabled as errors, with the `typescript`, `import`, `unicorn`, and `oxc` plugins. Two project-specific rules are set explicitly: `typescript/array-type` (`generic`, i.e. `Array<T>`) and `typescript/consistent-type-imports`.

**Type-aware linting** is enabled via the `--type-aware` flag (in the `lint`/`lint:fix`/`check` scripts), backed by the `oxlint-tsgolint` dev dependency. This restores type-information rules that the syntactic linter can't provide — e.g. `no-floating-promises`, `no-misused-promises`, `await-thenable`. (The separate `--type-check` flag, which runs full compiler diagnostics, is left off; `tsgo` via `npm run typecheck` covers that.)

**Solid rules** are restored by loading the official `eslint-plugin-solid` through oxlint's `jsPlugins` field (oxlint's ESLint-compatible JS plugin API). The `eslint-plugin-solid` TypeScript preset severities are mirrored in `.oxlintrc.json`, with two oxlint-specific adjustments: `solid/jsx-uses-vars` is off (oxlint detects JSX usage natively; the plugin's `markVariableAsUsed` API isn't implemented), and unused-namespace/React-compat noise rules are off. Note these Solid rules run in JS rather than Rust, so they don't get oxlint's native speed — acceptable for a project this size.

The policy is:

- Avoid `oxlint-disable` / `eslint-disable` comments; the rare justified exception must carry a `-- reason` justification (currently only `solid/no-innerhtml` on sanitized markdown and `solid/style-prop` on the valid-but-unrecognized `position-anchor` CSS property)
- Never silence warnings or errors without a documented reason
- Fix the root cause instead

This keeps the linter output trustworthy — if it reports zero errors, the codebase is clean.

**Migration trade-offs (from ESLint):** The `no-unassigned-vars` correctness rule is disabled because it produces false positives on Solid's `let ref; ... ref={ref}` binding pattern, which oxlint cannot see as an assignment. oxlint also does not yet implement `import/order`, so automatic import ordering is no longer enforced — import grouping is now left to convention and editor organize-imports (oxfmt's `sortImports` could restore this later; see the formatting section).

### Formatting: oxfmt (not Prettier)

Formatting uses **oxfmt** (`.oxfmtrc.json`) — the Oxc formatter — replacing Prettier. It keeps the same style the project used under Prettier (`semi: false`, `singleQuote: true`, `trailingComma: "all"`) and pins `printWidth: 80` to match the previous formatting (oxfmt's own default is 100). Lock files and generated `*.gen.ts` files are excluded via `ignorePatterns`.

Scripts: `npm run fmt` formats in place; `npm run fmt:check` verifies without writing (for CI); `npm run check` formats then runs `oxlint --fix`. Editor format-on-save is wired to the Oxc VS Code extension (`oxc.oxc-vscode`) in `.vscode/settings.json`, which also handles JS/TS/JSON.

**Early-days trade-off:** oxfmt is pre-1.0, so its output is not byte-identical to Prettier and may shift between releases — accepted for this project. oxfmt also has built-in (currently unused) sorting features for imports, Tailwind classes, and `package.json` that could later replace the `import/order` capability lost in the ESLint→oxlint migration.

### Environment Variables: Typed with @t3-oss/env-core

`src/env.ts` uses `@t3-oss/env-core` to define server and client environment variables with Zod schemas. The `VITE_` prefix convention is enforced at both the type level and runtime. Empty strings are treated as undefined (`emptyStringAsUndefined: true`), preventing subtle bugs with unset env vars.

### Content Validation in Lint Pipeline

`npm run lint` runs both oxlint and `scripts/validate-content.ts`. This means CI catches:

- TypeScript type errors (via `typecheck`)
- Code quality issues (via `lint` → oxlint)
- Content/schema drift (via `lint` → `validate-content`)

All three must pass before work is considered complete.

## Consequences

- Fast feedback: tsgo typechecks in a fraction of the time tsc takes
- High confidence: strict types + zero-assertion policy means runtime type errors are rare
- Content safety: broken CMS content is caught in CI, not in production
- Higher bar for contributors: the strict policies require familiarity with TypeScript's type system

## Revision History

- **2026-02-16** (Michael): Initial document capturing DX and tooling decisions
- **2026-06-27**: Migrated linting from ESLint to oxlint; documented trade-offs (no `import/order`, `no-unassigned-vars` disabled for Solid refs). Enabled type-aware linting via `oxlint-tsgolint` (`--type-aware`), and restored Solid rules by loading `eslint-plugin-solid` through oxlint's `jsPlugins`.
- **2026-06-27**: Migrated formatting from Prettier to oxfmt (`.oxfmtrc.json`); preserved the existing style (no semicolons, single quotes, trailing commas, 80-column), wired format-on-save to the Oxc VS Code extension, and accepted oxfmt's pre-1.0 status.
