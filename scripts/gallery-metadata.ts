/**
 * Gallery Metadata Reader
 *
 * Reads every content/gallery/*.md entry and reports, per photo, which
 * fields are filled in and which are still lacking — the read-only half of
 * the enrichment workflow that scripts/gallery-status.ts renders for humans.
 *
 * Unlike collectionSchemas.gallery (which *rejects* the blank alt text that
 * `gallery:add` intentionally writes, so `npm run lint` can't miss it), this
 * parses leniently: the whole point is to surface incompleteness rather than
 * throw on it. Every optional field falls back to `undefined` on a malformed
 * value instead of blowing up the report — validate-content.ts is the strict
 * gatekeeper; this is the "what's left to do" dashboard.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { GALLERY_EVENTS, OBJECT_POSITIONS } from '~/content/registry'
import type { GalleryEvent, ObjectPosition } from '~/content/registry'

export const GALLERY_DIR = 'content/gallery'

const rawEntrySchema = z.object({
  image: z.string().optional().catch(undefined),
  alt: z.string().optional().catch(undefined),
  description: z.string().optional().catch(undefined),
  position: z.enum(OBJECT_POSITIONS).optional().catch(undefined),
  date: z.coerce.date().optional().catch(undefined),
  event: z.enum(GALLERY_EVENTS).optional().catch(undefined),
  location: z.string().optional().catch(undefined),
  favorite: z.boolean().optional().catch(undefined),
})

export interface GalleryEntry {
  slug: string
  mdPath: string
  image: string | undefined
  imagePath: string | undefined
  imageExists: boolean
  alt: string
  description: string
  event: GalleryEvent | undefined
  location: string
  position: ObjectPosition | undefined
  favorite: boolean
  date: Date | undefined
}

function toEntry(slug: string): GalleryEntry {
  const mdPath = join(GALLERY_DIR, `${slug}.md`)
  const { data } = matter(readFileSync(mdPath, 'utf-8'))
  const parsed = rawEntrySchema.parse(data)
  const imagePath =
    parsed.image === undefined ? undefined : join(GALLERY_DIR, parsed.image)

  return {
    slug,
    mdPath,
    image: parsed.image,
    imagePath,
    imageExists: imagePath !== undefined && existsSync(imagePath),
    alt: (parsed.alt ?? '').trim(),
    description: (parsed.description ?? '').trim(),
    event: parsed.event,
    location: (parsed.location ?? '').trim(),
    position: parsed.position,
    favorite: parsed.favorite ?? false,
    date: parsed.date,
  }
}

/**
 * Reads and normalises all gallery entries, sorted by slug. Alt/description
 * are trimmed to `''` when absent so callers can treat "missing" and
 * "whitespace-only" identically (the same way the strict schema's
 * `.trim().min(1)` does for alt).
 */
export function readGalleryEntries(): Array<GalleryEntry> {
  if (!existsSync(GALLERY_DIR)) return []

  return readdirSync(GALLERY_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
    .sort((a, b) => a.localeCompare(b))
    .map(toEntry)
}

/**
 * A photo's overall readiness, worst problem first:
 * - `blocked`: something that stops it publishing — no alt text (fails
 *   `npm run lint`) or a missing/renamed image file.
 * - `sparse`: publishable, but thin — has alt text yet no description.
 * - `complete`: has both alt text and a description.
 */
export type EntryStatus = 'blocked' | 'sparse' | 'complete'

export interface GalleryEntryReport extends GalleryEntry {
  needsAlt: boolean
  needsDescription: boolean
  missingImage: boolean
  status: EntryStatus
}

export function classifyEntry(entry: GalleryEntry): GalleryEntryReport {
  const needsAlt = entry.alt === ''
  const needsDescription = entry.description === ''
  const missingImage = !entry.imageExists

  const status: EntryStatus =
    needsAlt || missingImage
      ? 'blocked'
      : needsDescription
        ? 'sparse'
        : 'complete'

  return { ...entry, needsAlt, needsDescription, missingImage, status }
}

export function readGalleryReports(): Array<GalleryEntryReport> {
  return readGalleryEntries().map(classifyEntry)
}

/** The editable subset of a gallery entry — everything the CMS form exposes
 * except the auto-managed `image`/`date`, which are preserved verbatim. A
 * `null` event/position means "clear this field" (the frontmatter key is
 * dropped entirely rather than written empty). */
export interface GalleryEntryEdit {
  alt: string
  description: string
  event: GalleryEvent | null
  location: string
  favorite: boolean
  position: ObjectPosition | null
}

// `image`, `width`/`height`/`color`, and `date` are round-tripped untouched
// — none of them are part of `GalleryEntryEdit` (the CMS-form-editable
// subset), so if this schema didn't explicitly carry them through, saving
// any other field via `gallery:edit` would silently drop them, and
// npm run lint's width/height/color check would start failing. `date` is
// read as `unknown` (not coerced) so its on-disk form — a quoted
// 'YYYY-MM-DD' string or a bare YAML timestamp — is re-emitted exactly as
// gray-matter parsed it, rather than being reformatted every save.
const preserveSchema = z.object({
  image: z.string(),
  width: z.number(),
  height: z.number(),
  color: z.string(),
  date: z.unknown(),
})

/**
 * Writes the editable fields back to a photo's .md file, preserving its
 * `image`/`width`/`height`/`color`/`date` and any body content, and
 * re-emitting frontmatter in the same canonical key order `gallery:add`
 * uses (image, width, height, color, alt, description, position, date,
 * event, location, favorite). Optional fields left blank are
 * omitted rather than written empty — matching how a hand-authored entry
 * looks.
 * Returns the freshly re-read, re-classified report so callers can reflect
 * the new status without re-scanning the whole directory.
 */
export function writeGalleryEntry(
  slug: string,
  edit: GalleryEntryEdit,
): GalleryEntryReport {
  const mdPath = join(GALLERY_DIR, `${slug}.md`)
  if (!existsSync(mdPath)) {
    throw new Error(`No gallery entry at ${mdPath}`)
  }

  const { data, content } = matter(readFileSync(mdPath, 'utf-8'))
  const preserved = preserveSchema.parse(data)

  const alt = edit.alt.trim()
  const description = edit.description.trim()
  const location = edit.location.trim()

  const frontmatter: Record<string, unknown> = {
    image: preserved.image,
    width: preserved.width,
    height: preserved.height,
    color: preserved.color,
    alt,
  }
  if (description !== '') frontmatter.description = description
  if (edit.position !== null) frontmatter.position = edit.position
  frontmatter.date = preserved.date
  if (edit.event !== null) frontmatter.event = edit.event
  if (location !== '') frontmatter.location = location
  if (edit.favorite) frontmatter.favorite = true

  const body = content.trim() === '' ? '' : content
  writeFileSync(mdPath, `${matter.stringify(body, frontmatter).trimEnd()}\n`)

  return classifyEntry(toEntry(slug))
}
