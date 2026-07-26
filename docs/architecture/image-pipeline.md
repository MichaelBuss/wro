---
name: Image Pipeline
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-07-10
codeAnchors:
  - scripts/image-settings.ts
  - scripts/optimize-images.ts
  - scripts/add-gallery-photos.ts
  - scripts/add-gallery-photos-wizard.ts
  - public/cms/config.yml
relatedPlans:
  - cms-content-layer
overview: >
  Sveltia CMS optimizes uploads to WebP directly in the browser before
  committing to public/uploads. A CLI script sharing the same settings
  handles batch/terminal uploads. Supersedes the earlier Sharp build-time
  pipeline.
---

# Image Pipeline

> **Status**: Implemented (July 2026). Supersedes the Sharp-based build-time pipeline described in earlier revisions of this document.

## Context

The site displays images in carousels and content pages. These need to be optimized (WebP) and capped at a reasonable size, with editors able to add new images without a developer in the loop.

## Decision

**Browser-side optimization via Sveltia CMS** — the CMS media library (`public/cms/config.yml`) converts any raster upload to WebP at up to 2048×2048px, quality 85, before committing it to `public/uploads/`. This happens entirely client-side in the editor's browser; the original file never touches the repo, and there's no server-side processing step or third-party image service involved.

**Shared settings, single source of truth** — `scripts/image-settings.ts` exports `IMAGE_QUALITY`, `IMAGE_MAX_PX`, and `IMAGE_FORMAT`. The CLI script imports these directly; `config.yml` can't import TypeScript, so its `media_libraries.all.transformations` block repeats the same values with a comment pointing back to `image-settings.ts` so the two don't silently drift.

**CLI optimizer for batch uploads** — `scripts/optimize-images.ts` (run via `npm run images:optimize <path> [path...]`) applies the identical transformation from the terminal, for cases where adding images through the CMS UI one at a time isn't convenient (e.g. migrating a batch of existing images). Output goes to `public/uploads/{filename}.webp`. Its per-file logic is exported as `optimizeImage()` for reuse.

**Batch gallery content generation** — `scripts/add-gallery-photos.ts` (run via `npm run gallery:add -- --year <number> [--event <event>] <path> [path...]`) builds on `optimizeImage()` to add a whole year's (or year+event's) worth of gallery entries in one command: for each input image it optimizes to `public/uploads/{slug}.webp` and writes a stub `content/gallery/{slug}.md` with placeholder alt text, skipping any entry that already exists on disk so reruns never clobber hand-edited metadata. Its per-photo logic is exported as `addOnePhoto()`, guarded the same way as `optimizeImage()` so importing it doesn't also trigger this file's own flag-parsing CLI. The gallery collection stays one-entry-per-photo — this script is a terminal-side layer on top of that model to avoid the CMS's one-entry-per-photo click-through when adding many photos at once, not a schema change.

**Edition location as a per-photo field** — where a year's edition was held (e.g. "Chiang-Mai, Thailand") lives in an optional `location` field on each gallery photo, shown as a subtitle on the `/gallery` year/event pages and in the lightbox. It's denormalized (repeated on every photo from the same year + event) rather than stored in a separate collection: `scripts/validate-content.ts` enforces that all photos sharing a `(year, event)` agree on it, so the group heading can read it off any one of them. `gallery:add --location` stamps it onto each new photo in a batch; `npm run gallery:edit` and the CMS expose it as a normal per-photo field. This replaced an earlier normalized `gallery-editions` collection (one `{year, event, location}` entry per edition), which carried disproportionate weight — a schema, a script, a CMS section, and bespoke orphan/duplicate/filename validation — for a single denormalizable string.

**Interactive wizard** — `scripts/add-gallery-photos-wizard.ts` (run via `npm run gallery:wizard`) is a [@clack/prompts](https://github.com/bombshell-dev/clack)-driven front-end over `addOnePhoto()`, for when typing out flags and shell globs by hand isn't convenient: it prompts for year and event, then lets you browse to a folder and multiselect which photos in it to add (all pre-selected by default), confirms, and shows a spinner checklist while it runs. It's a separate command rather than a mode of `gallery:add`, so the flag-driven command stays simple and safe to script/automate (e.g. in CI) without ever depending on `@clack/prompts`.

**No responsive srcset** — unlike the previous pipeline, only one WebP is produced per upload (no multi-width variants). This is acceptable for the current usage; `Figure` still accepts `srcset`/`sizes` props if responsive images are needed later.

## Consequences

- No build-time image processing step and no generated manifest to keep in sync
- Content editors can upload and optimize images without CLI access or a developer
- Images are committed as regular binary files tracked directly in Git — no separate source-vs-generated-output split
- `sharp` remains a devDependency, used only by the CLI script
- `@clack/prompts` remains a devDependency, used only by `add-gallery-photos-wizard.ts` — `add-gallery-photos.ts` and `optimize-images.ts` never import it, so the scriptable/CI-safe commands have no interactive-UI dependency surface
- If `IMAGE_QUALITY`, `IMAGE_MAX_PX`, or `IMAGE_FORMAT` change, `public/cms/config.yml`'s transformation values must be updated to match by hand (no automated sync)

## Alternatives Considered

**Keep the Sharp build-time pipeline**: Would require a custom Decap/Sveltia post-save hook to trigger reprocessing, adding infrastructure for a benefit (responsive multi-width srcset) not currently needed.

**Third-party image CDN/optimization service**: Adds a runtime dependency, API keys, and operational complexity for a small competition site with a handful of images.

## Revision History

- **2026-02-16** (Michael): Initial document capturing Sharp-based build-time image pipeline architecture
- **2026-07-03** (Michael): Replaced the Sharp build-time pipeline with Sveltia CMS's browser-side WebP optimization plus a CLI script sharing the same settings
- **2026-07-08** (Michael): Added `scripts/add-gallery-photos.ts` as a batch content-generation layer on top of `optimizeImage()`, for adding many gallery entries per command without a CMS schema change
- **2026-07-10** (Michael): Added `scripts/add-gallery-photos-wizard.ts` (`npm run gallery:wizard`) as a `@clack/prompts`-driven interactive alternative to `gallery:add`'s flags, sharing its logic via the newly-exported `addOnePhoto()`
- **2026-07-18** (Michael): Collapsed the normalized `gallery-editions` collection into an optional per-photo `location` field, enforced consistent per `(year, event)` by `validate-content.ts` — removing a collection, a script, a CMS section, and its bespoke validation in favour of a single denormalized string editable via `gallery:edit`
