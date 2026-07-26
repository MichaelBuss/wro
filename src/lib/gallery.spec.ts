import { describe, expect, it } from 'vitest'
import {
  findAdjacentGalleryPhoto,
  getEventFromSlug,
  toGalleryDisplayItem,
} from './gallery'
import type { GalleryPhoto } from './gallery'

function makePhoto(
  overrides: Partial<GalleryPhoto> & { slug: string; date: Date },
): GalleryPhoto {
  // `image` is already a resolved URL by the time it reaches lib/gallery.ts
  // (src/server/content.ts resolves the co-located filename beforehand) —
  // its exact shape doesn't matter to these tests, which never inspect it.
  return {
    image: `/resolved/${overrides.slug}.webp`,
    width: 1600,
    height: 1200,
    color: '#808080',
    alt: overrides.slug,
    ...overrides,
  }
}

describe('toGalleryDisplayItem', () => {
  it('carries the slug and a year-based key derived from the date through for linking', () => {
    const photo = makePhoto({ slug: 'dsc-1241', date: new Date('2011-06-15') })

    expect(toGalleryDisplayItem(photo)).toMatchObject({
      slug: 'dsc-1241',
      yearKey: '2011',
      year: 2011,
    })
  })
})

describe('getEventFromSlug', () => {
  it('resolves a URL slug back to its event, for the /gallery/$year/event/$event permalink', () => {
    expect(getEventFromSlug('world-final')).toBe('World Final')
    expect(getEventFromSlug('danish-final')).toBe('Danish Final')
  })

  it('returns undefined for a slug that matches no known event', () => {
    expect(getEventFromSlug('not-a-real-event')).toBeUndefined()
  })
})

describe('findAdjacentGalleryPhoto', () => {
  const photos: Array<GalleryPhoto> = [
    makePhoto({
      slug: 'wf-1',
      date: new Date('2011-07-10'),
      event: 'World Final',
    }),
    makePhoto({
      slug: 'wf-2',
      date: new Date('2011-07-11'),
      event: 'World Final',
    }),
    makePhoto({
      slug: 'wf-3',
      date: new Date('2011-07-12'),
      event: 'World Final',
    }),
    makePhoto({
      slug: 'df-1',
      date: new Date('2011-03-01'),
      event: 'Danish Final',
    }),
    makePhoto({ slug: 'solo-2012', date: new Date('2012-01-01') }),
  ]

  it('returns undefined when the year has no matching group', () => {
    expect(findAdjacentGalleryPhoto(photos, '1999', 'wf-1')).toBeUndefined()
  })

  it('returns undefined when the slug is not found within the year', () => {
    expect(
      findAdjacentGalleryPhoto(photos, '2011', 'does-not-exist'),
    ).toBeUndefined()
  })

  it('returns the photo plus its 1-based position and event group total', () => {
    const result = findAdjacentGalleryPhoto(photos, '2011', 'wf-2')

    expect(result).toMatchObject({
      eventKey: 'World Final',
      eventLabel: 'Verdensfinale',
      index: 2,
      total: 3,
    })
    expect(result?.photo.slug).toBe('wf-2')
  })

  it('returns neighbouring slugs scoped to the same year + event group, wrapping around, ordered by date', () => {
    const first = findAdjacentGalleryPhoto(photos, '2011', 'wf-1')
    expect(first).toMatchObject({ prevSlug: 'wf-3', nextSlug: 'wf-2' })

    const last = findAdjacentGalleryPhoto(photos, '2011', 'wf-3')
    expect(last).toMatchObject({ prevSlug: 'wf-2', nextSlug: 'wf-1' })
  })

  it('never crosses into a different event group within the same year', () => {
    const result = findAdjacentGalleryPhoto(photos, '2011', 'df-1')

    expect(result).toMatchObject({
      eventKey: 'Danish Final',
      eventLabel: 'Dansk finale',
      prevSlug: undefined,
      nextSlug: undefined,
      total: 1,
    })
  })

  it('hides prev/next when the group has only one photo', () => {
    const result = findAdjacentGalleryPhoto(photos, '2012', 'solo-2012')

    expect(result).toMatchObject({ prevSlug: undefined, nextSlug: undefined })
  })

  it('groups photos missing an event under the Misc/"Diverse" bucket', () => {
    const result = findAdjacentGalleryPhoto(photos, '2012', 'solo-2012')

    expect(result).toMatchObject({ eventKey: 'Misc', eventLabel: 'Diverse' })
  })

  it("surfaces the group's location, read from any photo in the year+event that records one", () => {
    const located: Array<GalleryPhoto> = [
      makePhoto({
        slug: 'wf-a',
        date: new Date('2011-07-10'),
        event: 'World Final',
      }),
      makePhoto({
        slug: 'wf-b',
        date: new Date('2011-07-11'),
        event: 'World Final',
        location: 'Abu Dhabi, UAE',
      }),
      makePhoto({
        slug: 'df-a',
        date: new Date('2011-03-01'),
        event: 'Danish Final',
      }),
    ]

    // wf-a has no location of its own, but its group-mate wf-b does.
    const result = findAdjacentGalleryPhoto(located, '2011', 'wf-a')
    expect(result?.eventLocation).toBe('Abu Dhabi, UAE')

    const noLocation = findAdjacentGalleryPhoto(located, '2011', 'df-a')
    expect(noLocation?.eventLocation).toBeUndefined()
  })
})
