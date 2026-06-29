---
name: solid-style
description: Solid.js component and reactivity patterns for the wro project. Use when writing or reviewing Solid.js components, signals, effects, or JSX.
---

# Solid.js Style Guide

Solid.js is **not React**. Its fine-grained reactivity model requires different patterns. React habits actively break Solid code — read this before writing any component.

## Reactivity Fundamentals

### Signals are functions — never destructure them

Solid tracks reactive dependencies by *calling* a signal. Destructuring freezes the value at read time and breaks reactivity.

```tsx
// BAD — reactivity lost, component won't update
const { count } = createSignal(0)  // this isn't even valid syntax
const [count] = createSignal(0)
const snapshot = count  // snapshot is now a static number

// GOOD — call the signal inside JSX or a reactive context
const [count, setCount] = createSignal(0)
return <div>{count()}</div>
```

### `createSignal` — local reactive state

```tsx
const [name, setName] = createSignal('')
const [items, setItems] = createSignal<Array<string>>([])

// Update immutably
setItems(prev => [...prev, 'new item'])
```

### `createMemo` — derived values

Use `createMemo` for values derived from signals. **Do not** use `createEffect` to derive values and write back to signals — that creates unnecessary reactivity cycles.

```tsx
// BAD — effect just to compute derived state
const [doubled, setDoubled] = createSignal(0)
createEffect(() => setDoubled(count() * 2))

// GOOD — memo is the right tool
const doubled = createMemo(() => count() * 2)
```

### `createEffect` — side effects only

`createEffect` is for code that talks to the outside world (DOM, network, logging). It runs after the component renders. Don't use it for computation.

```tsx
// GOOD — side effect on signal change
createEffect(() => {
  document.title = `${count()} items`
})
```

### Props are reactive too

Props are getter objects in Solid. Destructuring props in the component body kills reactivity — only destructure inside JSX or reactive contexts, or use `splitProps`.

```tsx
// BAD — title is frozen at first render
const MyComponent = ({ title }: { title: string }) => {
  const frozen = title  // no longer reactive
  return <h1>{frozen}</h1>
}

// GOOD — access props directly
const MyComponent = (props: { title: string }) => {
  return <h1>{props.title}</h1>
}

// GOOD — use splitProps to forward remaining props
const MyComponent = (props: { title: string; class?: string }) => {
  const [local, rest] = splitProps(props, ['title'])
  return <h1 class={local.class}>{local.title}</h1>
}
```

---

## Conditional and List Rendering

### Use `<Show>`, never `&&`

`&&` returns `0` when the left side is falsy — this renders a literal `0` in the DOM. Use `<Show>` instead.

```tsx
// BAD — renders "0" in the DOM when items is empty
{items().length && <List items={items()} />}

// GOOD
<Show when={items().length > 0}>
  <List items={items()} />
</Show>

// With fallback
<Show when={user()} fallback={<p>Not logged in</p>}>
  {(user) => <Profile user={user()} />}
</Show>
```

### Use `<Switch>/<Match>` for multiple conditions

```tsx
// BAD — nested ternaries
{status() === 'loading' ? <Spinner /> : status() === 'error' ? <Error /> : <Content />}

// GOOD
<Switch>
  <Match when={status() === 'loading'}><Spinner /></Match>
  <Match when={status() === 'error'}><Error /></Match>
  <Match when={status() === 'success'}><Content /></Match>
</Switch>
```

### Use `<For>` for lists

`<For>` is keyed by reference and optimised for Solid's reactivity. Use it instead of `array().map()` in JSX.

```tsx
// BAD — unkeyed, inefficient
{items().map(item => <Item item={item} />)}

// GOOD
<For each={items()}>
  {(item) => <Item item={item} />}
</For>

// With empty fallback
<For each={items()} fallback={<p>No items</p>}>
  {(item) => <Item item={item} />}
</For>
```

---

## Component Patterns

### Keep components pure

Components should be pure functions of their props and signals. All side effects go in `createEffect`. No mutations during render.

### One component per file

Each file exports exactly one component. Co-locate its spec file:

```
my-button.tsx
my-button.spec.ts
```

### Named exports only — no defaults

```tsx
// BAD
export default function MyButton() {}

// GOOD
export const MyButton = () => {}
```

### Children and slots

Prefer `children` and render props over prop-drilling JSX trees:

```tsx
// Wrap children() in an accessor to avoid over-evaluation
const MyCard = (props: { children: JSX.Element }) => {
  const resolved = children(() => props.children)
  return <div class="card">{resolved()}</div>
}
```

---

## Styling with CVA and Tailwind

### CVA for variants

Use `cva` (Class Variance Authority) for any component with visual variants. Never concatenate class strings manually.

```tsx
import { cva } from 'cva'
import { twMerge } from 'tailwind-merge'

const button = cva('rounded font-medium', {
  variants: {
    intent: {
      primary: 'bg-blue-600 text-white',
      ghost: 'bg-transparent text-blue-600',
    },
    size: {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'md',
  },
})

export const Button = (props: ButtonProps) => (
  <button class={twMerge(button({ intent: props.intent, size: props.size }), props.class)}>
    {props.children}
  </button>
)
```

### `class` prop is for positioning only

When consuming a component, pass a `class` prop **only** for layout concerns (margin, position, width). Never override appearance via `class` — use variants instead.

```tsx
// BAD — fighting the component's own styles
<Button class="bg-red-500 text-xs" />

// GOOD — layout only
<Button class="mt-4 w-full" intent="ghost" />
```

---

## Kobalte UI

Use Kobalte for all interactive accessible primitives. Don't rebuild: dialogs, popovers, tooltips, dropdowns, toggles, checkboxes, radio groups, select, tabs, accordion.

```tsx
import { Dialog } from '@kobalte/core/dialog'

export const MyDialog = () => (
  <Dialog>
    <Dialog.Trigger>Open</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay />
      <Dialog.Content>
        <Dialog.Title>Title</Dialog.Title>
        <Dialog.Description>Description</Dialog.Description>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
)
```

Check Kobalte's component list before building any interactive UI element from scratch.
