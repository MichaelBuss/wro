---
name: typescript-style-tu
description: TypeScript type safety practices, and Trackunit shared utilities. Use when working with TypeScript or JavaScript code.
---

## General Style

- **Prefer arrow functions**.
- **Prefer early returns** where possible.
- **Use descriptive names**—verbosity is okay.
- **Use `"as const"` where beneficial** to enforce immutable types.
- **Prefer `toSorted`, `toSpliced`, `toReversed`** to avoid modifying the original array.
- **No default exports.** Named exports prevent import confusion:

  ```ts
  // BAD
  export default function myFunction() {}

  // GOOD
  export const myFunction = () => {}
  ```

## Naming Conventions

- **kebab-case** for file names (e.g., `my-component.ts`)
- **camelCase** for variables and function names (e.g., `myVariable`, `myFunction()`)
- **PascalCase** for classes, types, and interfaces (e.g., `MyClass`, `MyType`)
- **ALL_CAPS** for constants and enum values (e.g., `MAX_COUNT`, `Color.RED`)
- **Prefix generic type parameters with `T`** (e.g., `TItem`, `TValue`). Keys with `Key` (e.g., `KeyItem`):
  ```ts
  type RecordOfArrays<TItem> = Record<string, Array<TItem>>
  ```

## Types

- **Prefer `type` over `interface`** by default. Exception: use `interface extends` for inheritance/composition — the `&` operator has terrible TypeScript performance:

  ```ts
  // BAD — slow type checking
  type C = A & B

  // GOOD — fast type checking
  interface C extends A, B {}
  ```

- **Leverage generics when appropriate**.
- **Prefer object parameters for functions** with multiple arguments.
- **Use explicit `Array<>` notation** instead of `[]`.
- **Use Zod for runtime type validation**, instead of manual TypeScript type guards.

## Enums

- **Do not introduce new enums.** Retain existing enums. Use `as const` objects instead:

  ```ts
  const backendToFrontendEnum = {
    xs: 'EXTRA_SMALL',
    sm: 'SMALL',
    md: 'MEDIUM',
  } as const

  type LowerCaseEnum = keyof typeof backendToFrontendEnum
  type UpperCaseEnum = (typeof backendToFrontendEnum)[LowerCaseEnum]
  ```

- Note: numeric enums produce a reverse mapping (`Object.keys(Direction).length` is 8 for 4 values). Be careful when iterating.

## Type Assertions and `any`

- **Never use `as` for type assertions.** Use `as const` for literal narrowing.
- **Never use `any`** — use the proper type, or `unknown` and validate with Zod.
- **Exception: generic function bodies.** TypeScript often cannot match runtime logic to conditional return types inside generic functions. Using `as any` on return values inside generic function bodies is acceptable when there is no concise alternative:
  ```ts
  const youSayGoodbyeISayHello = <TInput extends 'hello' | 'goodbye'>(
    input: TInput,
  ): TInput extends 'hello' ? 'goodbye' : 'hello' => {
    if (input === 'goodbye') {
      return 'hello' as any
    } else {
      return 'goodbye' as any
    }
  }
  ```
  Outside of generic functions, use `any` extremely sparingly.

## Discriminated Unions

- **Proactively use discriminated unions** to model data that can be in different shapes. Use switch statements to handle them with exhaustive checks:
  ```ts
  type Event =
    | { type: 'user.created'; data: { id: string; email: string } }
    | { type: 'user.deleted'; data: { id: string } }
  ```
- **Avoid the "bag of optionals" antipattern** — use discriminated unions to prevent impossible states:

  ```ts
  // BAD — allows impossible states
  type FetchingState<TData> = {
    status: 'idle' | 'loading' | 'success' | 'error'
    data?: TData
    error?: Error
  }

  // GOOD — prevents impossible states
  type FetchingState<TData> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: TData }
    | { status: 'error'; error: Error }
  ```

- **Ensure exhaustive switch cases** using `satisfies never` or `exhaustiveCheck` from @trackunit/shared-utils:
  ```ts
  default: {
    throw new Error(`${theValue satisfies never} is not known`);
  }
  ```

## Imports

- **Use `import type`** whenever importing a type. Prefer top-level `import type` over inline `import { type ... }`:

  ```ts
  // BAD — may leave side-effect import after transpilation
  import { type User } from './user'

  // GOOD
  import type { User } from './user'
  ```

## Properties and Immutability

- **Use `readonly` properties by default.** Omit `readonly` only when the property is genuinely mutable:
  ```ts
  type User = {
    readonly id: string
    readonly name: string
  }
  ```
- **Use optional properties (`?`) sparingly.** When a value can be absent but the caller should always explicitly acknowledge it, prefer `| undefined`:

  ```ts
  // BAD — easy to forget to pass
  type AuthOptions = { userId?: string }

  // GOOD — forces caller to be explicit
  type AuthOptions = { userId: string | undefined }
  ```

## Return Types

- **Declare return types on top-level module functions.** This helps both humans and AI assistants understand intent:
  ```ts
  const myFunc = (): string => {
    return 'hello'
  }
  ```
- **Exception:** React components returning JSX do not need an explicit return type.

## Error Handling

- **Think carefully before throwing.** If a thrown error produces a desirable outcome (e.g. inside a backend request handler), go for it.
- For code requiring manual try/catch, prefer a **Result type**:
  ```ts
  type Result<T, E extends Error> =
    | { ok: true; value: T }
    | { ok: false; error: E }
  ```

## Indexed Access Awareness

- If `noUncheckedIndexedAccess` is enabled in `tsconfig.json`, indexing into objects (`Record<string, string>`) and arrays (`string[]`) returns `T | undefined` instead of `T`. Handle accordingly.

## Shared Utilities

- Utilities from `src/lib/utils.ts`:
  - `filter(nonNullable)` is a type-safe alternative to `filter(Boolean)`.
  - `objectEntries`, `objectFromEntries`, `objectKeys`, and `objectValues` are type-safe alternatives.
  - Additional utilities:
    - `DistributiveOmit<>` instead of `Omit<>` for better union type support.
    - …and more!

## Dealing with Lint Issues

- Don't try to fix every single warning reported by eslint, but errors should be fixed.
- Do not remove comments just because linting says so. They might be used for debugging and that's up to the developer to clean up, not you.
