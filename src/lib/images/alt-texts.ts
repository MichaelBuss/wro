import type { CarouselFilename } from './manifest.generated'

/**
 * Alt text for all images, organized by folder.
 *
 * TypeScript enforces that EVERY image has alt text defined here.
 * When you add new images, run `npm run images:generate` and then
 * add the missing alt texts - TypeScript will show you what's missing.
 */
export const ALT_TEXTS = {
  carousel: {
    'abu-dhabi-1': 'WRO konkurrence i aktion',
    'abu-dhabi-2': 'Robotbyggeri og programmering',
  } satisfies Record<CarouselFilename, string>,

  // Add more folders as needed:
  // gallery: {
  //   'photo-1': 'Description here',
  // } satisfies Record<GalleryFilename, string>,
}

