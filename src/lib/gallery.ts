import { GALLERY_EVENTS } from '~/content/registry'
import type { CollectionItem, GalleryEvent } from '~/content/registry'

export const UNDATED_YEAR_KEY = 'andre'
const UNDATED_YEAR_LABEL = 'Andre billeder'

export const UNDATED_EVENT_KEY = 'andet'
const UNDATED_EVENT_LABEL = 'Andre billeder'

const EVENT_LABELS: Record<GalleryEvent, string> = {
  'Danish Final': 'Dansk finale',
  'World Final': 'Verdensfinale',
  'Panic Weekend': 'Panikweekend',
  Misc: 'Diverse',
}

export type GalleryPhoto = CollectionItem<'gallery'>

export type GalleryEventKey = GalleryEvent | typeof UNDATED_EVENT_KEY

export interface GalleryYearGroup {
  key: string
  label: string
  photos: Array<GalleryPhoto>
}

export interface GalleryEventGroup {
  key: GalleryEventKey
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

function getGalleryEventKey(photo: GalleryPhoto): GalleryEventKey {
  return photo.event ?? UNDATED_EVENT_KEY
}

function getGalleryEventLabel(key: GalleryEventKey): string {
  return key === UNDATED_EVENT_KEY ? UNDATED_EVENT_LABEL : EVENT_LABELS[key]
}

/**
 * Splits a year's photos into per-event sections (e.g. Danish final vs.
 * world final), preserving `GALLERY_EVENTS` order with photos missing an
 * `event` collected into a trailing "Andre billeder" bucket. Callers should
 * skip rendering sub-headings when this returns a single group — a lone
 * group means the year doesn't actually mix events.
 */
export function groupPhotosByEvent(
  photos: Array<GalleryPhoto>,
): Array<GalleryEventGroup> {
  const groups = new Map<GalleryEventKey, Array<GalleryPhoto>>()

  for (const photo of photos) {
    const key = getGalleryEventKey(photo)
    const existing = groups.get(key)

    if (existing) {
      existing.push(photo)
    } else {
      groups.set(key, [photo])
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNDATED_EVENT_KEY) return 1
      if (b === UNDATED_EVENT_KEY) return -1
      return GALLERY_EVENTS.indexOf(a) - GALLERY_EVENTS.indexOf(b)
    })
    .map(([key, groupPhotos]) => ({
      key,
      label: getGalleryEventLabel(key),
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
