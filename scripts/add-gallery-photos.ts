/**
 * Batch Gallery Photo Importer
 *
 * Adds a whole year's (or year+event's) worth of gallery photos in one
 * command, without the CMS's one-entry-per-photo click-through — while
 * still producing the per-photo alt/favorite/position metadata the CMS
 * entries support.
 *
 * For each input image, in argv order, this:
 * - Optimizes it to public/uploads/{slug}.webp (scripts/optimize-images.ts)
 * - Writes a stub content/gallery/{slug}.md with placeholder alt text
 * - Skips (with a warning) any image whose .md entry already exists, so
 *   reruns never clobber hand-edited entries
 *
 * Run with:
 *   npm run gallery:add -- --year 2024 --event "Danish Final" photos/2024-dm/*.jpg
 *
 * Rewrite the placeholder alt text before publishing — it's a stand-in for
 * accessibility purposes, not a real description.
 */

import { existsSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { GALLERY_EVENTS } from '~/content/registry'
import type { GalleryEvent } from '~/content/registry'
import { EVENT_LABELS } from '~/lib/gallery'
import { optimizeImage } from './optimize-images'

const GALLERY_DIR = 'content/gallery'

const yearSchema = z.coerce.number().int()
const eventSchema = z.enum(GALLERY_EVENTS)

interface ParsedArgs {
  year: number
  event: GalleryEvent | undefined
  imagePaths: Array<string>
}

function printUsageAndExit(message: string): never {
  console.error(message)
  console.error(
    'Usage: npm run gallery:add -- --year <number> [--event <event>] <path> [path...]',
  )
  console.error(`Valid --event values: ${GALLERY_EVENTS.join(', ')}`)
  process.exit(1)
}

function parseArgs(argv: Array<string>): ParsedArgs {
  let year: number | undefined
  let event: GalleryEvent | undefined
  const imagePaths: Array<string> = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv.at(i)

    if (arg === '--year') {
      const value = argv.at(i + 1)
      i += 1
      const result = yearSchema.safeParse(value)
      if (!result.success) {
        printUsageAndExit(`Invalid --year value: ${value ?? '(missing)'}`)
      }
      year = result.data
      continue
    }

    if (arg === '--event') {
      const value = argv.at(i + 1)
      i += 1
      const result = eventSchema.safeParse(value)
      if (!result.success) {
        printUsageAndExit(`Invalid --event value: ${value ?? '(missing)'}`)
      }
      event = result.data
      continue
    }

    if (arg !== undefined) {
      imagePaths.push(arg)
    }
  }

  if (year === undefined) {
    printUsageAndExit('Missing required --year <number> flag')
  }

  if (imagePaths.length === 0) {
    printUsageAndExit('No image paths provided')
  }

  return { year, event, imagePaths }
}

function buildPlaceholderAlt(options: {
  year: number
  event: GalleryEvent | undefined
  index: number
}): string {
  const { year, event, index } = options
  const eventPart = event === undefined ? '' : ` fra ${EVENT_LABELS[event]}`
  return `Foto${eventPart} ${year} (${index})`
}

export interface AddOnePhotoResult {
  status: 'created' | 'skipped'
  mdPath: string
}

/**
 * Optimizes one image and writes its stub gallery entry, unless an entry
 * for it already exists. Shared by the CLI loop below and
 * scripts/add-gallery-photos-wizard.ts.
 */
export async function addOnePhoto(
  inputPath: string,
  options: { year: number; event: GalleryEvent | undefined; index: number },
): Promise<AddOnePhotoResult> {
  const { year, event, index } = options
  const slug = basename(inputPath, extname(inputPath))
  const mdPath = join(GALLERY_DIR, `${slug}.md`)

  if (existsSync(mdPath)) {
    return { status: 'skipped', mdPath }
  }

  await optimizeImage(inputPath)

  const frontmatter = {
    image: `/uploads/${slug}.webp`,
    alt: buildPlaceholderAlt({ year, event, index }),
    year,
    ...(event === undefined ? {} : { event }),
    order: index,
  }

  writeFileSync(mdPath, `${matter.stringify('', frontmatter).trimEnd()}\n`)

  return { status: 'created', mdPath }
}

async function main() {
  const { year, event, imagePaths } = parseArgs(process.argv.slice(2))

  let created = 0
  let skipped = 0

  for (const [i, inputPath] of imagePaths.entries()) {
    const index = i + 1
    const result = await addOnePhoto(inputPath, { year, event, index })

    if (result.status === 'skipped') {
      console.warn(`Skipping ${inputPath} — ${result.mdPath} already exists`)
      skipped += 1
      continue
    }

    console.log(`${inputPath} → ${result.mdPath}`)
    created += 1
  }

  console.log('')
  console.log(
    `Created ${created} entr${created === 1 ? 'y' : 'ies'}, skipped ${skipped}.`,
  )

  if (created > 0) {
    console.log(
      'Reminder: rewrite the placeholder alt text in the new entries before publishing — it is not a real accessibility description.',
    )
  }
}

// Only auto-run when executed directly (e.g. via `npm run gallery:add`), not
// when imported for its `addOnePhoto()` export (e.g. by
// add-gallery-photos-wizard.ts) — otherwise the importer's own argv would be
// misinterpreted as this script's CLI flags/paths. Same guard as
// optimize-images.ts.
const isMain = import.meta.url === `file://${process.argv[1]}`

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
