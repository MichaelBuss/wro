import { IMAGE_META } from './alt-texts'
import type { ObjectPosition } from './alt-texts'
import { IMAGE_MANIFEST } from './manifest.generated'

export interface SiteImage {
  src: string
  srcset?: string
  sizes?: string
  alt: string
  objectPosition?: ObjectPosition
}

function buildSrcset(folder: string, filename: string, widths: ReadonlyArray<number>): string {
  return widths
    .map((width) => `/images/${folder}/${filename}-${width}.webp ${width}w`)
    .join(', ')
}

function getDefaultSrc(folder: string, filename: string, widths: ReadonlyArray<number>): string {
  const defaultWidth = widths[Math.floor(widths.length / 2)] ?? widths[0]
  return `/images/${folder}/${filename}-${defaultWidth}.webp`
}

/**
 * Build a typed image array from folder filenames and metadata.
 * Images are served as responsive WebP from /images/{folder}/
 */
export function buildImageArray<T extends keyof typeof IMAGE_MANIFEST>(
  folder: T,
  sizes = '100vw',
): Array<SiteImage> {
  const folderManifest = IMAGE_MANIFEST[folder]
  const meta = IMAGE_META[folder] as Record<
    string,
    { alt: string; position?: ObjectPosition }
  >

  return (Object.keys(folderManifest) as Array<keyof typeof folderManifest>).map((filename) => {
    const widths = folderManifest[filename] as ReadonlyArray<number>
    return {
      src: getDefaultSrc(folder, String(filename), widths),
      srcset: buildSrcset(folder, String(filename), widths),
      sizes,
      alt: meta[String(filename)].alt,
      objectPosition: meta[String(filename)].position,
    }
  })
}

/**
 * Responsive image assets for the carousel/gallery folder.
 * Add images to assets/images/carousel/ and run `npm run images:generate`
 */
export const CAROUSEL_IMAGES = buildImageArray('carousel', '100vw')
