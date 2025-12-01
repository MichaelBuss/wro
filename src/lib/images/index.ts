import type { CarouselImage } from '~/components/carousel'
import { ALT_TEXTS } from './alt-texts'
import { IMAGE_FOLDERS } from './manifest.generated'

/**
 * Build a typed image array from folder filenames and alt texts.
 * Images are served as WebP from /images/{folder}/
 */
function buildImageArray<T extends keyof typeof IMAGE_FOLDERS>(
  folder: T,
): Array<CarouselImage> {
  const filenames = IMAGE_FOLDERS[folder]
  const altTexts = ALT_TEXTS[folder] as Record<string, string>

  return filenames.map((filename) => ({
    src: `/images/${folder}/${filename}.webp`,
    alt: altTexts[filename],
  }))
}

/**
 * Carousel images for the hero section.
 * Add images to public/images/carousel/ and run `npm run images:generate`
 */
export const CAROUSEL_IMAGES = buildImageArray('carousel')

// Export more image arrays as you add folders:
// export const GALLERY_IMAGES = buildImageArray('gallery')
// export const SPONSOR_IMAGES = buildImageArray('sponsors')

