import type { CollectionItem } from '~/content/registry'

export const UNDATED_YEAR_KEY = 'andre'
const UNDATED_YEAR_LABEL = 'Andre billeder'

export type GalleryPhoto = CollectionItem<'gallery'>

export interface GalleryYearGroup {
  key: string
  label: string
  photos: Array<GalleryPhoto>
}

export function getGalleryYearKey(photo: GalleryPhoto): string {
  return photo.year != null ? String(photo.year) : UNDATED_YEAR_KEY
}

export function getGalleryYearLabel(key: string): string {
  return key === UNDATED_YEAR_KEY ? UNDATED_YEAR_LABEL : key
}

function byOrder(a: GalleryPhoto, b: GalleryPhoto): number {
  return (a.order ?? 999) - (b.order ?? 999)
}

/**
 * Groups photos by year (newest first), with undated photos collected into
 * a trailing "Andre billeder" bucket rather than dropped.
 */
export function groupGalleryByYear(
  photos: Array<GalleryPhoto>,
): Array<GalleryYearGroup> {
  const groups = new Map<string, Array<GalleryPhoto>>()

  for (const photo of photos) {
    const key = getGalleryYearKey(photo)
    const existing = groups.get(key)

    if (existing) {
      existing.push(photo)
    } else {
      groups.set(key, [photo])
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNDATED_YEAR_KEY) return 1
      if (b === UNDATED_YEAR_KEY) return -1
      return Number(b) - Number(a)
    })
    .map(([key, groupPhotos]) => ({
      key,
      label: getGalleryYearLabel(key),
      photos: [...groupPhotos].sort(byOrder),
    }))
}

/**
 * Maps a validated gallery content item onto the plain shape consumed by
 * the `Gallery` and `PhotoGrid` display components, decoupling them from
 * the content schema.
 */
export function toGalleryDisplayItem(photo: GalleryPhoto) {
  return {
    src: photo.image,
    alt: photo.alt,
    caption: photo.description,
    year: photo.year,
    objectPosition: photo.position,
  }
}

/**
 * Picks the photos to highlight for a preview (homepage or year teaser):
 * favorited photos first, falling back to the lowest `order` values when
 * fewer than `limit` photos are favorited.
 */
export function pickGalleryHighlights(
  photos: Array<GalleryPhoto>,
  limit: number,
): Array<GalleryPhoto> {
  const sorted = [...photos].sort(byOrder)
  const favorites = sorted.filter((photo) => photo.favorite)

  if (favorites.length >= limit) {
    return favorites.slice(0, limit)
  }

  const fillerSlugs = new Set(favorites.map((photo) => photo.slug))
  const filler = sorted.filter((photo) => !fillerSlugs.has(photo.slug))

  return [...favorites, ...filler].slice(0, limit)
}
