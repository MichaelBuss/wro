import { IMAGE_META } from './alt-texts'
import type { ObjectPosition } from './alt-texts'
import { IMAGE_FOLDERS, IMAGE_WIDTHS } from './manifest.generated'

export interface SiteImage {
  src: string
  srcset?: string
  sizes?: string
  alt: string
  objectPosition?: ObjectPosition
}

function buildSrcset(folder: string, filename: string): string {
  return IMAGE_WIDTHS.map(
    (width) => `/images/${folder}/${filename}-${width}.webp ${width}w`,
  ).join(', ')
}

function getDefaultSrc(folder: string, filename: string): string {
  const defaultWidth = IMAGE_WIDTHS[Math.floor(IMAGE_WIDTHS.length / 2)]
  return `/images/${folder}/${filename}-${defaultWidth}.webp`
}

/**
 * Build a typed image array from folder filenames and metadata.
 * Images are served as responsive WebP from /images/{folder}/
 */
export function buildImageArray<T extends keyof typeof IMAGE_FOLDERS>(
  folder: T,
  sizes = '100vw',
): Array<SiteImage> {
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
 * Responsive image assets for the carousel/gallery folder.
 * Add images to assets/images/carousel/ and run `npm run images:generate`
 */
export const CAROUSEL_IMAGES = buildImageArray('carousel', '100vw')
