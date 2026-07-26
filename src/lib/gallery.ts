import { GALLERY_EVENTS } from '~/content/registry'
import type { CollectionItem, GalleryEvent } from '~/content/registry'

export const EVENT_LABELS: Record<GalleryEvent, string> = {
  'Danish Final': 'Dansk finale',
  'World Final': 'Verdensfinale',
  'Panic Weekend': 'Panikweekend',
  Misc: 'Diverse',
}

/**
 * URL-safe slugs for each event, used by the `/gallery/$year/event/$event`
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
 * appear on both `/gallery` and their respective permalinks
 * (`/gallery/$year`, `/gallery/$year/event/$event`) — giving each heading a
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
 * Reads the edition location off a group of photos. Location is opt-in and
 * denormalized onto each photo, and validate-content.ts guarantees every
 * photo in a (year, event) group that sets one agrees — so the first photo
 * that has a non-empty location speaks for the whole group. Returns
 * `undefined` when none of the group's photos record a location.
 */
function findGroupLocation(photos: Array<GalleryPhoto>): string | undefined {
  const located = photos.find((photo) => (photo.location ?? '') !== '')
  return located?.location
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

      return {
        key,
        label: EVENT_LABELS[key],
        photos: sortedPhotos,
        location: findGroupLocation(sortedPhotos),
      }
    })
}

/**
 * Maps a validated gallery content item onto the plain shape consumed by
 * the `Gallery` and `PhotoGrid` display components, decoupling them from
 * the content schema. `slug` and `yearKey` are included so callers can link
 * each tile to its lightbox route (`/gallery/$year/$slug`).
 */
export function toGalleryDisplayItem(photo: GalleryPhoto) {
  return {
    src: photo.image,
    width: photo.width,
    height: photo.height,
    color: photo.color,
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
  eventKey: GalleryEvent
  eventLabel: string
  eventLocation: string | undefined
  prevSlug: string | undefined
  nextSlug: string | undefined
  // Full neighbours, not just their slugs — the lightbox's swipe gesture
  // peeks at them (a colour placeholder immediately, the real photo once
  // loaded), which needs their src/dimensions/color up front, not just
  // something to link to.
  prevPhoto: GalleryPhoto | undefined
  nextPhoto: GalleryPhoto | undefined
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
): AdjacentGalleryPhoto | undefined {
  const yearGroup = groupGalleryByYear(photos).find(
    (group) => group.key === yearKey,
  )
  if (!yearGroup) return undefined

  const eventGroup = groupPhotosByEvent(yearGroup.photos).find((group) =>
    group.photos.some((photo) => photo.slug === slug),
  )
  if (!eventGroup) return undefined

  // `index` is guaranteed valid (0..length-1): the `.some()` check above
  // already confirmed a photo with this slug exists in the group.
  const index = eventGroup.photos.findIndex((photo) => photo.slug === slug)
  const photo = eventGroup.photos[index]

  const total = eventGroup.photos.length
  const prevPhoto =
    total > 1 ? eventGroup.photos[(index - 1 + total) % total] : undefined
  const nextPhoto =
    total > 1 ? eventGroup.photos[(index + 1) % total] : undefined

  return {
    photo,
    eventKey: eventGroup.key,
    eventLabel: eventGroup.label,
    eventLocation: eventGroup.location,
    prevSlug: prevPhoto?.slug,
    nextSlug: nextPhoto?.slug,
    prevPhoto,
    nextPhoto,
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
