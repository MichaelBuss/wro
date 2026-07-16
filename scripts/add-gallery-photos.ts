/**
 * Batch Gallery Photo Importer
 *
 * Adds a whole year's (or year+event's) worth of gallery photos in one
 * command, without the CMS's one-entry-per-photo click-through — while
 * still producing the per-photo alt/favorite/position metadata the CMS
 * entries support.
 *
 * For each input image, sorted by capture date (see scripts/photo-date.ts),
 * this:
 * - Optimizes it to content/gallery/{slug}.webp (scripts/optimize-images.ts)
 * - Writes a stub content/gallery/{slug}.md with blank alt text and the
 *   photo's capture date (from EXIF, falling back to file mtime)
 * - Skips (with a warning) any image whose .md entry already exists, so
 *   reruns never clobber hand-edited entries
 * - Warns if a photo's capture date doesn't match the selected --year, or
 *   if no EXIF date was found at all
 *
 * Run with:
 *   npm run gallery:add -- --year 2024 --event "Danish Final" photos/2024-dm/*.jpg
 *
 * Optionally records where that year+event was held:
 *   npm run gallery:add -- --year 2024 --event "World Final" --location "Panama City, Panama" photos/*.jpg
 *
 * Alt text is left blank intentionally (not a placeholder) — `npm run lint`
 * fails on empty alt text, so entries can't reach publishing without a real
 * description being written in.
 */

import { existsSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import matter from 'gray-matter'
import { z } from 'zod'
import { GALLERY_EVENTS } from '~/content/registry'
import type { GalleryEvent } from '~/content/registry'
import { upsertGalleryEdition } from './gallery-editions'
import { optimizeImage } from './optimize-images'
import { formatDateOnly, readPhotoDate } from './photo-date'

const GALLERY_DIR = 'content/gallery'

const yearSchema = z.coerce.number().int()
const eventSchema = z.enum(GALLERY_EVENTS)

interface ParsedArgs {
  year: number
  event: GalleryEvent | undefined
  location: string | undefined
  imagePaths: Array<string>
}

function printUsageAndExit(message: string): never {
  console.error(message)
  console.error(
    'Usage: npm run gallery:add -- --year <number> [--event <event>] [--location <text>] <path> [path...]',
  )
  console.error(`Valid --event values: ${GALLERY_EVENTS.join(', ')}`)
  process.exit(1)
}

function parseArgs(argv: Array<string>): ParsedArgs {
  let year: number | undefined
  let event: GalleryEvent | undefined
  let location: string | undefined
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

    if (arg === '--location') {
      const value = argv.at(i + 1)
      i += 1
      if (value === undefined) {
        printUsageAndExit('Missing value for --location')
      }
      location = value
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

  if (location !== undefined && event === undefined) {
    printUsageAndExit(
      '--location requires --event, to know which edition it belongs to',
    )
  }

  return { year, event, location, imagePaths }
}

export interface AddOnePhotoResult {
  status: 'created' | 'skipped'
  mdPath: string
  warnings: Array<string>
}

/**
 * Optimizes one image and writes its stub gallery entry, unless an entry
 * for it already exists. Shared by the CLI loop below and
 * scripts/add-gallery-photos-wizard.ts. `date`/`dateSource` are read
 * up-front by the caller (see `readPhotoDate`) so a whole batch can be
 * sorted chronologically before this is called per-photo.
 */
export async function addOnePhoto(
  inputPath: string,
  options: {
    year: number
    event: GalleryEvent | undefined
    date: Date
    dateSource: 'exif' | 'mtime'
  },
): Promise<AddOnePhotoResult> {
  const { year, event, date, dateSource } = options
  const slug = basename(inputPath, extname(inputPath))
  const mdPath = join(GALLERY_DIR, `${slug}.md`)

  if (existsSync(mdPath)) {
    return { status: 'skipped', mdPath, warnings: [] }
  }

  const warnings: Array<string> = []
  if (dateSource === 'mtime') {
    warnings.push(
      `${inputPath}: no EXIF capture date found — using the file's modification time (${formatDateOnly(date)}) instead. Fix the "date" field by hand if that's wrong.`,
    )
  }
  if (date.getFullYear() !== year) {
    warnings.push(
      `${inputPath}: capture date ${formatDateOnly(date)} is in ${date.getFullYear()}, not the selected --year ${year}. Double-check it belongs in the ${year} season.`,
    )
  }

  await optimizeImage(inputPath, GALLERY_DIR)

  const frontmatter = {
    image: `${slug}.webp`,
    alt: '',
    date: formatDateOnly(date),
    ...(event === undefined ? {} : { event }),
  }

  writeFileSync(mdPath, `${matter.stringify('', frontmatter).trimEnd()}\n`)

  return { status: 'created', mdPath, warnings }
}

async function main() {
  const { year, event, location, imagePaths } = parseArgs(process.argv.slice(2))

  const dated = await Promise.all(
    imagePaths.map(async (inputPath) => ({
      inputPath,
      ...(await readPhotoDate(inputPath)),
    })),
  )
  dated.sort((a, b) => a.date.getTime() - b.date.getTime())

  let created = 0
  let skipped = 0

  for (const { inputPath, date, source } of dated) {
    const result = await addOnePhoto(inputPath, {
      year,
      event,
      date,
      dateSource: source,
    })

    for (const warning of result.warnings) {
      console.warn(`Warning: ${warning}`)
    }

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
      'Reminder: the new entries have blank alt text — fill it in before publishing (npm run lint will fail until you do).',
    )
  }

  if (location !== undefined && event !== undefined) {
    const result = upsertGalleryEdition({ year, event, location })

    if (result.status === 'created') {
      console.log(`Recorded location for ${year} ${event}: ${result.mdPath}`)
    } else if (result.status === 'conflict') {
      console.warn(
        `Warning: ${result.mdPath} already records a different location ("${result.existingLocation}") — leaving it as-is. Edit it by hand if "${location}" is correct.`,
      )
    }
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
