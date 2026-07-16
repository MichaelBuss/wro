import { GALLERY_EVENTS } from '~/content/registry'
import type { CollectionItem, GalleryEvent } from '~/content/registry'

export const EVENT_LABELS: Record<GalleryEvent, string> = {
  'Danish Final': 'Dansk finale',
  'World Final': 'Verdensfinale',
  'Panic Weekend': 'Panikweekend',
  Misc: 'Diverse',
}

/**
 * URL-safe slugs for each event, used by the `/galleri/$year/event/$event`
 * permalink. Kept as an explicit map (rather than a generic slugify) since
 * `GALLERY_EVENTS` is a small, fixed set — same approach as `EVENT_LABELS`.
 */
export const EVENT_SLUGS: Record<GalleryEvent, string> = {
  'Danish Final': 'danish-final',
  'World Final': 'world-final',
  'Panic Weekend': 'panic-weekend',
  Misc: 'misc',
}

export function getEventFromSlug(slug: string): GalleryEvent | undefined {
  return GALLERY_EVENTS.find((event) => EVENT_SLUGS[event] === slug)
}

/**
 * Shared `view-transition-name` values for the year/event headings that
 * appear on both `/galleri` and their respective permalinks
 * (`/galleri/$year`, `/galleri/$year/event/$event`) — giving each heading a
 * name here (rather than inlining the string at each call site) keeps the
 * two sides of every morph in sync. Mirrors the `photo-${slug}` convention
 * already used for gallery images.
 */
export function getYearTransitionName(year: string): string {
  return `year-${year}`
}

export function getEventTransitionName(
  year: string,
  eventSlug: string,
): string {
  return `event-${year}-${eventSlug}`
}

export type GalleryPhoto = CollectionItem<'gallery'>
export type GalleryEdition = CollectionItem<'gallery-editions'>

export interface GalleryYearGroup {
  key: string
  label: string
  photos: Array<GalleryPhoto>
}

export interface GalleryEventGroup {
  key: GalleryEvent
  label: string
  photos: Array<GalleryPhoto>
  location: string | undefined
}

export function getGalleryYearKey(photo: GalleryPhoto): string {
  return String(photo.date.getFullYear())
}

function byDate(a: GalleryPhoto, b: GalleryPhoto): number {
  return a.date.getTime() - b.date.getTime()
}

/**
 * Groups photos by year (newest first), sorted chronologically within
 * each year. Every photo has a `date`, so every photo lands in exactly
 * one year — there's no "undated" catch-all group.
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
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([key, groupPhotos]) => ({
      key,
      label: key,
      photos: [...groupPhotos].sort(byDate),
    }))
}

function getGalleryEventKey(photo: GalleryPhoto): GalleryEvent {
  return photo.event ?? 'Misc'
}

/**
 * Finds the location recorded for a given year + event in the
 * `gallery-editions` collection, if any. Returns `undefined` when no
 * edition entry exists for that pairing — locations are opt-in.
 */
function findEditionLocation(
  editions: Array<GalleryEdition>,
  year: number,
  event: GalleryEvent,
): string | undefined {
  return editions.find((e) => e.year === year && e.event === event)?.location
}

/**
 * Splits a year's photos into per-event sections (e.g. Danish final vs.
 * world final), preserving `GALLERY_EVENTS` order, with photos missing an
 * `event` grouped under `Misc`. Callers should skip rendering
 * sub-headings when this returns a single group — a lone group means the
 * year doesn't actually mix events.
 */
export function groupPhotosByEvent(
  photos: Array<GalleryPhoto>,
  editions: Array<GalleryEdition> = [],
): Array<GalleryEventGroup> {
  const groups = new Map<GalleryEvent, Array<GalleryPhoto>>()

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
    .sort(([a], [b]) => GALLERY_EVENTS.indexOf(a) - GALLERY_EVENTS.indexOf(b))
    .map(([key, groupPhotos]) => {
      const sortedPhotos = [...groupPhotos].sort(byDate)
      const year = sortedPhotos[0].date.getFullYear()

      return {
        key,
        label: EVENT_LABELS[key],
        photos: sortedPhotos,
        location: findEditionLocation(editions, year, key),
      }
    })
}

/**
 * Maps a validated gallery content item onto the plain shape consumed by
 * the `Gallery` and `PhotoGrid` display components, decoupling them from
 * the content schema. `slug` and `yearKey` are included so callers can link
 * each tile to its lightbox route (`/galleri/$year/$slug`).
 */
export function toGalleryDisplayItem(photo: GalleryPhoto) {
  return {
    src: photo.image,
    alt: photo.alt,
    caption: photo.description,
    year: photo.date.getFullYear(),
    objectPosition: photo.position,
    slug: photo.slug,
    yearKey: getGalleryYearKey(photo),
  }
}

export interface AdjacentGalleryPhoto {
  photo: GalleryPhoto
  eventLabel: string
  eventLocation: string | undefined
  prevSlug: string | undefined
  nextSlug: string | undefined
  index: number
  total: number
}

/**
 * Locates a photo within its year + event group (mirroring how the gallery
 * grids are organized via `groupPhotosByEvent`) and returns enough context
 * to drive the lightbox: the photo itself, its neighbours for prev/next
 * navigation (wrapping around; `undefined` when the group has only one
 * photo), its 1-based position, and the group's total count.
 */
export function findAdjacentGalleryPhoto(
  photos: Array<GalleryPhoto>,
  yearKey: string,
  slug: string,
  editions: Array<GalleryEdition> = [],
): AdjacentGalleryPhoto | undefined {
  const yearGroup = groupGalleryByYear(photos).find(
    (group) => group.key === yearKey,
  )
  if (!yearGroup) return undefined

  const eventGroup = groupPhotosByEvent(yearGroup.photos, editions).find(
    (group) => group.photos.some((photo) => photo.slug === slug),
  )
  if (!eventGroup) return undefined

  // `index` is guaranteed valid (0..length-1): the `.some()` check above
  // already confirmed a photo with this slug exists in the group.
  const index = eventGroup.photos.findIndex((photo) => photo.slug === slug)
  const photo = eventGroup.photos[index]

  const total = eventGroup.photos.length
  const prevSlug =
    total > 1 ? eventGroup.photos[(index - 1 + total) % total]?.slug : undefined
  const nextSlug =
    total > 1 ? eventGroup.photos[(index + 1) % total]?.slug : undefined

  return {
    photo,
    eventLabel: eventGroup.label,
    eventLocation: eventGroup.location,
    prevSlug,
    nextSlug,
    index: index + 1,
    total,
  }
}

/**
 * Picks the photos to highlight for a preview (homepage or year teaser):
 * favorited photos first, falling back to the most recent photos when
 * fewer than `limit` photos are favorited.
 */
export function pickGalleryHighlights(
  photos: Array<GalleryPhoto>,
  limit: number,
): Array<GalleryPhoto> {
  const sorted = [...photos].sort(byDate).reverse()
  const favorites = sorted.filter((photo) => photo.favorite)

  if (favorites.length >= limit) {
    return favorites.slice(0, limit)
  }

  const fillerSlugs = new Set(favorites.map((photo) => photo.slug))
  const filler = sorted.filter((photo) => !fillerSlugs.has(photo.slug))

  return [...favorites, ...filler].slice(0, limit)
}
