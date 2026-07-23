/**
 * Gallery Dimension Sync
 *
 * Recomputes every gallery photo's width/height/dominant color straight off
 * its .webp file and writes them into frontmatter, in place. This is the fix
 * for whatever `npm run lint`'s width/height/color check
 * (scripts/validate-content.ts) flags as out of sync — most likely a photo
 * added by hand through the CMS (which doesn't compute these), or an entry
 * from before this feature existed. Safe to re-run any time: it always
 * recomputes from the file rather than trusting what's already on disk, so
 * it's also the backfill for brand-new fields.
 *
 * Run with: npm run gallery:sync-dimensions
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { collectionSchemas } from '~/content/registry'
import { readImageMetadata } from './image-metadata'

const GALLERY_DIR = 'content/gallery'

// Same shape as collectionSchemas.gallery, except width/height/color are
// optional (this script's whole job is filling them in when they're
// missing) and date is read as `unknown` so its on-disk form is preserved
// verbatim rather than reformatted on every sync.
const legacyGallerySchema = collectionSchemas.gallery
  .omit({ width: true, height: true, color: true, date: true })
  .extend({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    color: z.string().optional(),
    date: z.unknown(),
  })

async function main() {
  const files = readdirSync(GALLERY_DIR).filter((f) => f.endsWith('.md'))
  let synced = 0
  let skipped = 0

  for (const file of files) {
    const mdPath = join(GALLERY_DIR, file)
    const { data, content } = matter(readFileSync(mdPath, 'utf-8'))

    const parsed = legacyGallerySchema.safeParse(data)
    if (!parsed.success) {
      console.warn(
        `Skipping ${file} — frontmatter doesn't validate (run npm run lint for details)`,
      )
      skipped += 1
      continue
    }
    const entry = parsed.data

    const { width, height, color } = await readImageMetadata(
      join(GALLERY_DIR, entry.image),
    )

    if (
      entry.width === width &&
      entry.height === height &&
      entry.color === color
    ) {
      continue
    }

    const frontmatter: Record<string, unknown> = {
      image: entry.image,
      width,
      height,
      color,
      alt: entry.alt,
    }
    if (entry.description !== undefined)
      frontmatter.description = entry.description
    if (entry.position !== undefined) frontmatter.position = entry.position
    frontmatter.date = entry.date
    if (entry.event !== undefined) frontmatter.event = entry.event
    if (entry.location !== undefined) frontmatter.location = entry.location
    if (entry.favorite) frontmatter.favorite = true

    const body = content.trim() === '' ? '' : content
    writeFileSync(mdPath, `${matter.stringify(body, frontmatter).trimEnd()}\n`)

    console.log(`${file}: synced (${width}×${height}, ${color})`)
    synced += 1
  }

  console.log('')
  console.log(
    `Synced ${synced}, skipped ${skipped}, already up to date ${
      files.length - synced - skipped
    }.`,
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
