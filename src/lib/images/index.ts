import type { CarouselImage } from '~/components/carousel'
import { IMAGE_META } from './alt-texts'
import type { ObjectPosition } from './alt-texts'
import { IMAGE_FOLDERS, IMAGE_WIDTHS } from './manifest.generated'

/**
 * Build the srcset string for a responsive image.
 * Format: "/images/folder/name-640.webp 640w, /images/folder/name-1024.webp 1024w, ..."
 */
function buildSrcset(folder: string, filename: string): string {
  return IMAGE_WIDTHS.map(
    (width) => `/images/${folder}/${filename}-${width}.webp ${width}w`,
  ).join(', ')
}

/**
 * Get the default src (middle size for good balance).
 * Used as fallback for browsers that don't support srcset.
 */
function getDefaultSrc(folder: string, filename: string): string {
  const defaultWidth = IMAGE_WIDTHS[Math.floor(IMAGE_WIDTHS.length / 2)]
  return `/images/${folder}/${filename}-${defaultWidth}.webp`
}

/**
 * Build a typed image array from folder filenames and metadata.
 * Images are served as responsive WebP from /images/{folder}/
 */
function buildImageArray<T extends keyof typeof IMAGE_FOLDERS>(
  folder: T,
  sizes = '100vw',
): Array<CarouselImage> {
  const filenames = IMAGE_FOLDERS[folder]
  const meta = IMAGE_META[folder] as Record<
    string,
    { alt: string; position?: ObjectPosition }
  >

  return filenames.map((filename) => ({
    src: getDefaultSrc(folder, filename),
    srcset: buildSrcset(folder, filename),
    sizes,
    alt: meta[filename].alt,
    objectPosition: meta[filename].position,
  }))
}

/**
 * Carousel images for the hero section.
 * Add images to assets/images/carousel/ and run `npm run images:generate`
 */
export const CAROUSEL_IMAGES = buildImageArray('carousel', '100vw')

// Export more image arrays as you add folders:
// export const GALLERY_IMAGES = buildImageArray('gallery', '(max-width: 768px) 100vw, 50vw')
// export const SPONSOR_IMAGES = buildImageArray('sponsors', '200px')
