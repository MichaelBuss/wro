import type { CarouselFilename } from './manifest.generated'

/**
 * Valid CSS object-position values for controlling image focal points.
 * Used when images are cropped with object-cover.
 *
 * Defined as a const tuple so it can be shared with Zod schemas via `z.enum()`.
 */
export const OBJECT_POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top center',
  'top right',
  'center left',
  'center right',
  'bottom left',
  'bottom center',
  'bottom right',
] as const

export type ObjectPosition = (typeof OBJECT_POSITIONS)[number]

/** Metadata for a single image */
export interface ImageMeta {
  /** Alt text for accessibility (required) */
  alt: string
  /** Focal point for cropping. Defaults to 'center' if not specified */
  position?: ObjectPosition
}

/**
 * Metadata for all images, organized by folder.
 *
 * TypeScript enforces that EVERY image has metadata defined here.
 * When you add new images, run `npm run images:generate` and then
 * add the missing metadata - TypeScript will show you what's missing.
 */
export const IMAGE_META = {
  carousel: {
    'abu-dhabi-1': {
      alt: 'WRO konkurrence i aktion',
    },
    'abu-dhabi-2': {
      alt: 'Robotbyggeri og programmering',
      position: 'top center',
    },
  } satisfies Record<CarouselFilename, ImageMeta>,

  // Add more folders as needed:
  // gallery: {
  //   'photo-1': { alt: 'Description here', position: 'center' },
  // } satisfies Record<GalleryFilename, ImageMeta>,
}

/** @deprecated Use IMAGE_META instead */
export const ALT_TEXTS = {
  carousel: Object.fromEntries(
    Object.entries(IMAGE_META.carousel).map(([k, v]) => [k, v.alt]),
  ) as Record<CarouselFilename, string>,
}
