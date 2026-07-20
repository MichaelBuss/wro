/**
 * Interactive Gallery Photo Wizard
 *
 * A clack-driven front-end over scripts/add-gallery-photos.ts's per-photo
 * logic, for when you'd rather be prompted than remember flag syntax and
 * shell globs. Always interactive — for scripting/CI, use
 * `npm run gallery:add -- --year <number> [--event <event>] <path> [path...]`
 * directly instead.
 *
 * Prompts for the year and event, then lets you browse to a folder and pick
 * which photos in it to add (all pre-selected by default).
 *
 * Run with: npm run gallery:wizard
 */

import { readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  path,
  select,
  tasks,
  text,
} from '@clack/prompts'
import { z } from 'zod'
import { GALLERY_EVENTS } from '~/content/registry'
import type { GalleryEvent } from '~/content/registry'
import { EVENT_LABELS } from '~/lib/gallery'
import { addOnePhoto } from './add-gallery-photos'
import { readPhotoDate } from './photo-date'

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
  '.tiff',
])

const yearSchema = z.coerce.number().int()

async function promptOrCancel<T>(result: Promise<T | symbol>): Promise<T> {
  const value = await result
  if (isCancel(value)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return value
}

async function promptForYear(): Promise<number> {
  const value = await promptOrCancel(
    text({
      message: 'Which year are these photos from?',
      placeholder: String(new Date().getFullYear()),
      validate: (input) => {
        const result = yearSchema.safeParse(input)
        return result.success ? undefined : 'Enter a valid year, e.g. 2024'
      },
    }),
  )
  return yearSchema.parse(value)
}

async function promptForEvent(): Promise<GalleryEvent | undefined> {
  return promptOrCancel(
    select({
      message: 'Which event?',
      options: [
        { value: undefined, label: 'No specific event' },
        ...GALLERY_EVENTS.map((event) => ({
          value: event,
          label: EVENT_LABELS[event],
        })),
      ],
    }),
  )
}

function listImageFiles(dir: string): Array<string> {
  return readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(dir, name))
}

async function promptForLocation(
  year: number,
  event: GalleryEvent | undefined,
): Promise<string | undefined> {
  if (event === undefined) return undefined

  const value = await promptOrCancel(
    text({
      message: `Where was ${EVENT_LABELS[event]} ${year} held?`,
      placeholder: 'e.g. Panama City, Panama — leave blank to skip',
    }),
  )
  return value === '' ? undefined : value
}

async function promptForImagePaths(): Promise<Array<string>> {
  for (;;) {
    const folder = await promptOrCancel(
      path({
        message: 'Which folder are the photos in?',
        directory: true,
      }),
    )

    const found = listImageFiles(folder)

    if (found.length === 0) {
      log.warn(`No image files found in ${folder}`)
      continue
    }

    return promptOrCancel(
      multiselect({
        message: `Select the photos to add from ${folder}`,
        options: found.map((filePath) => ({
          value: filePath,
          label: basename(filePath),
        })),
        initialValues: found,
      }),
    )
  }
}

async function main() {
  intro('Add gallery photos')

  const year = await promptForYear()
  const event = await promptForEvent()
  const imagePaths = await promptForImagePaths()
  const location = await promptForLocation(year, event)

  const proceed = await promptOrCancel(
    confirm({
      message: `Create ${imagePaths.length} entr${imagePaths.length === 1 ? 'y' : 'ies'} for ${year}${event === undefined ? '' : ` (${EVENT_LABELS[event]})`}?`,
    }),
  )

  if (!proceed) {
    cancel('Aborted.')
    process.exit(0)
  }

  log.step('Reading capture dates from EXIF…')
  const dated = await Promise.all(
    imagePaths.map(async (inputPath) => ({
      inputPath,
      ...(await readPhotoDate(inputPath)),
    })),
  )
  dated.sort((a, b) => a.date.getTime() - b.date.getTime())

  let created = 0
  let skipped = 0
  const warnings: Array<string> = []

  await tasks(
    dated.map(({ inputPath, date, source }) => ({
      title: inputPath,
      task: async () => {
        const result = await addOnePhoto(inputPath, {
          year,
          event,
          location,
          date,
          dateSource: source,
        })

        warnings.push(...result.warnings)

        if (result.status === 'created') {
          created += 1
          return `Created ${result.mdPath}`
        }

        skipped += 1
        return `Skipped — ${result.mdPath} already exists`
      },
    })),
  )

  for (const warning of warnings) {
    log.warn(warning)
  }

  if (location !== undefined && event !== undefined && skipped > 0) {
    log.info(
      `Location was written onto the new entries; ${skipped} existing one${skipped === 1 ? ' was' : 's were'} skipped — set their location via npm run gallery:edit if needed.`,
    )
  }

  outro(
    `Created ${created} entr${created === 1 ? 'y' : 'ies'}, skipped ${skipped}.` +
      (created > 0
        ? ' The new entries have blank alt text — fill it in before publishing (npm run lint will fail until you do).' +
          ' Run npm run gallery:edit to fill in the missing alt text (and any other details) for the new entries.'
        : ''),
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
