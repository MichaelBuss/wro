---
name: testing
description: Vitest testing patterns, anti-patterns, and TDD workflow for the wro project. Use when writing, reviewing, or debugging tests.
---

# Testing Guide

## Setup

Tests use **Vitest** (`npm test`). Test files are co-located with the file they test:

```
src/lib/utils.ts
src/lib/utils.spec.ts

src/components/my-button.tsx
src/components/my-button.spec.ts
```

---

## Structure: AAA

Every test follows **Arrange / Act / Assert**:

```ts
it('filters out null values from an array', () => {
  // Arrange
  const input = [1, null, 2, undefined, 3]

  // Act
  const result = input.filter(nonNullable)

  // Assert
  expect(result).toEqual([1, 2, 3])
})
```

Keep `it` descriptions as plain English behaviour statements, not implementation details:

```ts
// BAD — describes implementation
it('calls setCount with count + 1')

// GOOD — describes behaviour
it('increments the counter when the button is clicked')
```

---

## What to Test

**Test behaviour, not implementation.**

- Test what the code *does* from the outside — inputs, outputs, side effects.
- Don't test how it does it internally (which functions are called, which branches are taken).

```ts
// BAD — testing implementation
expect(mockInternalHelper).toHaveBeenCalledWith(42)

// GOOD — testing outcome
expect(result).toEqual({ status: 'success', value: 42 })
```

---

## Forbidden Patterns

### No snapshot tests

Snapshots are brittle, hard to review in PRs, and give false confidence. Test concrete, meaningful assertions instead.

```ts
// BAD
expect(component).toMatchSnapshot()

// GOOD
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
```

### No asserting that mocks were called (without reason)

Only assert mock call counts/arguments when the *number of calls* or *exact arguments* is the observable behaviour being tested. Testing that a mock was called at all is usually a sign you're testing implementation.

```ts
// BAD — tests implementation
expect(mockFetch).toHaveBeenCalled()

// GOOD — tests outcome
expect(result).toEqual(expectedData)
```

### No testing mock internals

Don't mock a dependency and then assert on the mock's internals. Test the real outcome instead.

---

## Mocking

### Always spread `importActual`

When mocking a module with `vi.mock`, always spread the real module to avoid silently removing exports:

```ts
// BAD — all other exports become undefined
vi.mock('./my-module', () => ({
  myFunction: vi.fn(),
}))

// GOOD — only override what you need
vi.mock('./my-module', async () => ({
  ...(await vi.importActual('./my-module')),
  myFunction: vi.fn(),
}))
```

### Import `vi` explicitly

Never rely on `vi` being a global. Import it from `vitest`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
```

### Prefer real implementations over mocks

Only mock what you have to (network, time, random). If you need to mock 3+ dependencies to test a function, that's a signal the function is doing too much.

---

## TDD Gate for Bug Fixes

When fixing a bug, follow this order:

1. **Write a failing test** that reproduces the bug. Confirm it fails.
2. **Fix the bug.**
3. **Confirm the test passes.**
4. Check no other tests regressed.

Never fix a bug without a test. The test is proof the bug existed and won't return.

---

## Verification Gate

**Always run tests before claiming work is done:**

```bash
npm test
```

If tests fail, fix them — don't skip, disable, or mock them away. A passing test suite with skipped tests is not a passing test suite.
