/**
 * Gallery Edition Location Writer
 *
 * Records where a given year+event's photos were taken (e.g. "World Final
 * 2023 — Panama City, Panama") as a `content/gallery-editions/*.md` entry,
 * shown as a subtitle on that year's /galleri page and in the lightbox.
 *
 * One entry per (year, event) pairing — never per photo, so the location
 * can't drift between photos from the same edition. Shared by
 * add-gallery-photos.ts and its wizard front-end.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import type { GalleryEvent } from '~/content/registry'

const EDITIONS_DIR = 'content/gallery-editions'

const existingLocationSchema = z.object({ location: z.string() })

/**
 * Shared with validate-content.ts, which checks that every edition's
 * filename still matches `{year}-{slugifyEvent(event)}` — i.e. nobody hand-
 * edited the frontmatter after creation without renaming the file to match.
 */
export function slugifyEvent(event: GalleryEvent): string {
  return event.toLowerCase().replace(/\s+/g, '-')
}

export type UpsertGalleryEditionResult =
  | { status: 'created'; mdPath: string }
  | { status: 'unchanged'; mdPath: string }
  | { status: 'conflict'; mdPath: string; existingLocation: string }

/**
 * Writes a new edition entry, or reports what's already there without
 * overwriting it — mirroring add-gallery-photos.ts's "never clobber
 * hand-edited entries" rule for photos.
 */
export function upsertGalleryEdition(options: {
  year: number
  event: GalleryEvent
  location: string
}): UpsertGalleryEditionResult {
  const { year, event, location } = options
  const mdPath = join(EDITIONS_DIR, `${year}-${slugifyEvent(event)}.md`)

  if (existsSync(mdPath)) {
    const { data } = matter(readFileSync(mdPath, 'utf-8'))
    const parsed = existingLocationSchema.safeParse(data)
    const existingLocation = parsed.success ? parsed.data.location : ''

    if (existingLocation === location) {
      return { status: 'unchanged', mdPath }
    }
    return { status: 'conflict', mdPath, existingLocation }
  }

  const frontmatter = { year, event, location }
  writeFileSync(mdPath, `${matter.stringify('', frontmatter).trimEnd()}\n`)

  return { status: 'created', mdPath }
}
