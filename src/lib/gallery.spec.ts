import { describe, expect, it } from 'vitest'
import {
  UNDATED_YEAR_KEY,
  findAdjacentGalleryPhoto,
  toGalleryDisplayItem,
} from './gallery'
import type { GalleryPhoto } from './gallery'

function makePhoto(
  overrides: Partial<GalleryPhoto> & { slug: string },
): GalleryPhoto {
  return {
    image: `/uploads/${overrides.slug}.webp`,
    alt: overrides.slug,
    ...overrides,
  }
}

describe('toGalleryDisplayItem', () => {
  it('carries the slug and a year-based key through for linking', () => {
    const photo = makePhoto({ slug: 'dsc-1241', year: 2011 })

    expect(toGalleryDisplayItem(photo)).toMatchObject({
      slug: 'dsc-1241',
      yearKey: '2011',
    })
  })

  it('falls back to the undated year key when the photo has no year', () => {
    const photo = makePhoto({ slug: 'abu-dhabi-1' })

    expect(toGalleryDisplayItem(photo).yearKey).toBe(UNDATED_YEAR_KEY)
  })
})

describe('findAdjacentGalleryPhoto', () => {
  const photos: Array<GalleryPhoto> = [
    makePhoto({ slug: 'wf-1', year: 2011, event: 'World Final', order: 1 }),
    makePhoto({ slug: 'wf-2', year: 2011, event: 'World Final', order: 2 }),
    makePhoto({ slug: 'wf-3', year: 2011, event: 'World Final', order: 3 }),
    makePhoto({ slug: 'df-1', year: 2011, event: 'Danish Final', order: 1 }),
    makePhoto({ slug: 'solo-2012', year: 2012, order: 1 }),
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
      eventLabel: 'Verdensfinale',
      index: 2,
      total: 3,
    })
    expect(result?.photo.slug).toBe('wf-2')
  })

  it('returns neighbouring slugs scoped to the same year + event group, wrapping around', () => {
    const first = findAdjacentGalleryPhoto(photos, '2011', 'wf-1')
    expect(first).toMatchObject({ prevSlug: 'wf-3', nextSlug: 'wf-2' })

    const last = findAdjacentGalleryPhoto(photos, '2011', 'wf-3')
    expect(last).toMatchObject({ prevSlug: 'wf-2', nextSlug: 'wf-1' })
  })

  it('never crosses into a different event group within the same year', () => {
    const result = findAdjacentGalleryPhoto(photos, '2011', 'df-1')

    expect(result).toMatchObject({
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
})
