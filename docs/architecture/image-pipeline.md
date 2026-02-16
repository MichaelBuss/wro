---
name: Image Pipeline
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - scripts/generate-images.ts
  - src/lib/images/
relatedPlans:
  - cms-content-layer
overview: >
  Build-time image generation with Sharp producing responsive WebP variants at
  four breakpoints, with a type-safe generated manifest. Transitioning toward
  Decap CMS-managed images with a custom processing script.
---

# Image Pipeline

> **Status**: Implemented (February 2026). Transitioning to Decap CMS integration.

## Context

The site displays images in carousels and content pages. These need to be responsive (multiple sizes), optimized (WebP), and have proper alt text and focal-point metadata for accessibility and cropping.

## Decision

**Build-time generation** — `scripts/generate-images.ts` uses Sharp to convert source images from `assets/images/{folder}/` into optimized WebP at four responsive widths (640, 1024, 1280, 1920px). Output goes to `public/images/{folder}/`. This avoids runtime image transformation services and their associated costs.

**Type-safe manifest** — the script generates `src/lib/images/manifest.generated.ts`, which exports:
- `IMAGE_FOLDERS` — a const object mapping folder names to filename arrays
- `IMAGE_WIDTHS` — the available width breakpoints
- Per-folder filename union types (e.g., `CarouselFilename`)

TypeScript enforces that every image has corresponding metadata defined in `src/lib/images/alt-texts.ts` — adding a new image without alt text is a compile error.

**Incremental processing** — the script skips images whose outputs are newer than the source, making re-runs fast. A `--force` flag regenerates everything.

**Alt text and focal points** — `IMAGE_META` in `alt-texts.ts` stores alt text (required) and an optional `ObjectPosition` for controlling `object-fit` cropping. The `satisfies Record<FolderFilename, ImageMeta>` pattern ensures completeness.

## Planned Change

The pipeline is transitioning to use **Decap CMS for image uploads** combined with a **custom processing script**. This will allow content editors to upload images through the CMS while still running them through the Sharp optimization pipeline. The current `assets/images/` source directory approach may be replaced or supplemented by CMS-uploaded files.

## Consequences

- No runtime cost or third-party dependency for image optimization
- Type safety catches missing metadata at compile time
- Carousel items can reference either generated images or CMS-uploaded paths
- The generated manifest is a committed file — image changes show up in version control

## Revision History

- **2026-02-16** (Michael): Initial document capturing image pipeline architecture
