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

Content editors upload images through the CMS at `/admin`, which optimizes them to WebP in the browser before committing. Blog images go to the shared `public/uploads/`; gallery photos are co-located with their entry (see below), since Sveltia CMS supports both layouts per-collection (`public/admin/config.yml`). For batch-adding images from the terminal (e.g. migrating existing files), use:

```bash
npm run images:optimize path/to/photo1.jpg path/to/photo2.jpg
# Outputs: public/uploads/photo1.webp, public/uploads/photo2.webp
```

This applies the identical transformation (WebP, quality 85, max 2048px) defined in `scripts/image-settings.ts`, which is the single source of truth shared with the CMS config (`public/admin/config.yml`).

Gallery photos are a flat `content/gallery/{slug}.md` entry plus its image co-located right beside it, e.g. `content/gallery/{slug}.webp` — rather than being uploaded to the shared `public/uploads/`. The `image` frontmatter field is just that bare filename. `public/gallery` is a symlink to `content/gallery`, so those images are served directly (both in dev and the Netlify build) at `/gallery/{filename}`, the same way `public/uploads/` always worked — `src/server/content.ts` just builds that path string, no separate asset pipeline involved. Deleting an entry through the CMS deletes its image with it — no separate "clean up the upload" step, and no risk of it going orphaned.

To add a whole year's (or year+event's) worth of gallery photos at once, skipping the CMS's one-entry-per-photo click-through:

```bash
npm run gallery:add -- --year 2024 --event "Danish Final" photos/2024-dm/*.jpg
# Outputs: content/gallery/{name}.md (with blank alt text) + content/gallery/{name}.webp for each photo
```

Each photo's `date` is read from its EXIF capture date (falling back to the file's modification time, with a warning, if EXIF is missing) — this drives sort order and which year it's grouped under on `/galleri`, so there's no separate "order" field to maintain by hand. The importer also warns if a photo's capture date doesn't match the `--year` you passed.

Add `--location "City, Country"` (requires `--event`) to record where that year's edition was held. It's a per-photo field (`location:` in the frontmatter), stamped onto every new photo in the batch and shown as a subtitle on the year/event pages. `npm run lint` enforces that all photos sharing a year + event agree on it, so the group heading can read it off any one of them. Existing entries are skipped by the importer, so set their location via `npm run gallery:edit` or by hand.

Or run `npm run gallery:wizard` for an interactive version of the same command — it prompts for the year/event/location and lets you browse to a folder and pick which photos to add, instead of typing flags and shell globs by hand.

Fill in the blank alt text in the generated entries before publishing — `npm run lint` fails on empty alt text, so this can't be forgotten.

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
