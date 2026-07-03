---
name: Image Pipeline
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-07-03
codeAnchors:
  - scripts/image-settings.ts
  - scripts/optimize-images.ts
  - public/admin/config.yml
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

**Browser-side optimization via Sveltia CMS** — the CMS media library (`public/admin/config.yml`) converts any raster upload to WebP at up to 2048×2048px, quality 85, before committing it to `public/uploads/`. This happens entirely client-side in the editor's browser; the original file never touches the repo, and there's no server-side processing step or third-party image service involved.

**Shared settings, single source of truth** — `scripts/image-settings.ts` exports `IMAGE_QUALITY`, `IMAGE_MAX_PX`, and `IMAGE_FORMAT`. The CLI script imports these directly; `config.yml` can't import TypeScript, so its `media_libraries.all.transformations` block repeats the same values with a comment pointing back to `image-settings.ts` so the two don't silently drift.

**CLI optimizer for batch uploads** — `scripts/optimize-images.ts` (run via `npm run images:optimize <path> [path...]`) applies the identical transformation from the terminal, for cases where adding images through the CMS UI one at a time isn't convenient (e.g. migrating a batch of existing images). Output goes to `public/uploads/{filename}.webp`.

**No responsive srcset** — unlike the previous pipeline, only one WebP is produced per upload (no multi-width variants). This is acceptable for the current usage; `Figure` still accepts `srcset`/`sizes` props if responsive images are needed later.

## Consequences

- No build-time image processing step and no generated manifest to keep in sync
- Content editors can upload and optimize images without CLI access or a developer
- Images are committed as regular binary files tracked directly in Git — no separate source-vs-generated-output split
- `sharp` remains a devDependency, used only by the CLI script
- If `IMAGE_QUALITY`, `IMAGE_MAX_PX`, or `IMAGE_FORMAT` change, `public/admin/config.yml`'s transformation values must be updated to match by hand (no automated sync)

## Alternatives Considered

**Keep the Sharp build-time pipeline**: Would require a custom Decap/Sveltia post-save hook to trigger reprocessing, adding infrastructure for a benefit (responsive multi-width srcset) not currently needed.

**Third-party image CDN/optimization service**: Adds a runtime dependency, API keys, and operational complexity for a small competition site with a handful of images.

## Revision History

- **2026-02-16** (Michael): Initial document capturing Sharp-based build-time image pipeline architecture
- **2026-07-03** (Michael): Replaced the Sharp build-time pipeline with Sveltia CMS's browser-side WebP optimization plus a CLI script sharing the same settings
