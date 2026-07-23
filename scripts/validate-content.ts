/**
 * Content Validation Script
 *
 * Ensures bidirectional consistency between the content registry and files on disk:
 * - Every singleton page key in the registry has a corresponding .md file
 * - Every .md file in content/pages/ has a corresponding registry key
 * - Every collection key in the registry has a corresponding directory
 * - Every directory in content/ (except pages/) has a corresponding collection key
 * - All frontmatter validates against its Zod schema
 * - Every gallery photo's image exists in content/gallery/, and every
 *   image in that directory is referenced by exactly one photo (no
 *   orphans, no duplicates), at the right format/size, with frontmatter's
 *   width/height/color still matching the actual file
 * - Every photo sharing a (year, event) records the same edition location,
 *   so the group heading can read it off any one of them without ambiguity
 *
 * Run with: npm run validate:content
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import matter from 'gray-matter'
import { collectionSchemas, pageSchemas } from '../src/content/registry'
import { objectKeys } from '../src/lib/utils'
import { readImageMetadata } from './image-metadata'
import { IMAGE_MAX_PX } from './image-settings'

const CONTENT_DIR = join(process.cwd(), 'content')
const PAGES_DIR = join(CONTENT_DIR, 'pages')
const GALLERY_DIR = join(CONTENT_DIR, 'gallery')

interface ValidationError {
  type:
    | 'missing-file'
    | 'orphaned-file'
    | 'missing-dir'
    | 'orphaned-dir'
    | 'schema-error'
    | 'dangling-image'
    | 'duplicate-image'
    | 'orphaned-image'
    | 'invalid-image-format'
    | 'oversized-image'
    | 'image-metadata-mismatch'
    | 'inconsistent-location'
  message: string
}

const errors: Array<ValidationError> = []

function error(type: ValidationError['type'], message: string) {
  errors.push({ type, message })
  console.error(`  ERROR: ${message}`)
}

/**
 * Groups items by a derived string key. Shared building block for both the
 * gallery-image and per-edition location consistency checks below, so "group
 * by key, then check the group" logic can't drift between the two.
 */
function groupByKey<T>(
  items: Array<T>,
  getKey: (item: T) => string,
): Map<string, Array<T>> {
  const groups = new Map<string, Array<T>>()

  for (const item of items) {
    const key = getKey(item)
    const existing = groups.get(key)

    if (existing) {
      existing.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  return groups
}

/** Flags any key with more than one item grouped under it. */
function checkNoDuplicates<T>(
  groups: Map<string, Array<T>>,
  type: ValidationError['type'],
  formatMessage: (items: Array<T>) => string,
) {
  for (const items of groups.values()) {
    if (items.length > 1) {
      error(type, formatMessage(items))
    }
  }
}

/** Flags any item whose key has no match in `referencedKeys`. */
function checkAllReferenced<T>(
  items: Array<T>,
  getKey: (item: T) => string,
  referencedKeys: ReadonlySet<string>,
  type: ValidationError['type'],
  formatMessage: (item: T) => string,
) {
  for (const item of items) {
    if (!referencedKeys.has(getKey(item))) {
      error(type, formatMessage(item))
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Validate singleton pages
// ---------------------------------------------------------------------------

console.log('Validating singleton pages...')

const registeredPages = objectKeys(pageSchemas)
const pageFilesOnDisk = existsSync(PAGES_DIR)
  ? readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  : []

for (const key of registeredPages) {
  const filePath = join(PAGES_DIR, `${key}.md`)

  if (!existsSync(filePath)) {
    error(
      'missing-file',
      `Registry defines page "${key}" but content/pages/${key}.md does not exist`,
    )
    continue
  }

  const fileContent = readFileSync(filePath, 'utf-8')
  const { data } = matter(fileContent)
  const schema = pageSchemas[key]
  const result = schema.safeParse(data)

  if (!result.success) {
    error(
      'schema-error',
      `content/pages/${key}.md frontmatter validation failed:\n    ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n    ')}`,
    )
  }
}

for (const file of pageFilesOnDisk) {
  if (!Object.hasOwn(pageSchemas, file)) {
    error(
      'orphaned-file',
      `content/pages/${file}.md exists but "${file}" is not defined in pageSchemas`,
    )
  }
}

// ---------------------------------------------------------------------------
// 2. Validate folder collections
// ---------------------------------------------------------------------------

console.log('Validating folder collections...')

const registeredCollections = objectKeys(collectionSchemas)

const contentDirs = existsSync(CONTENT_DIR)
  ? readdirSync(CONTENT_DIR).filter((entry) => {
      const fullPath = join(CONTENT_DIR, entry)
      return statSync(fullPath).isDirectory() && entry !== 'pages'
    })
  : []

for (const collection of registeredCollections) {
  const collectionDir = join(CONTENT_DIR, collection)

  if (!existsSync(collectionDir)) {
    error(
      'missing-dir',
      `Registry defines collection "${collection}" but content/${collection}/ does not exist`,
    )
    continue
  }

  const files = readdirSync(collectionDir).filter((f) => f.endsWith('.md'))
  const schema = collectionSchemas[collection]

  for (const file of files) {
    const filePath = join(collectionDir, file)
    const fileContent = readFileSync(filePath, 'utf-8')
    const { data } = matter(fileContent)
    const result = schema.safeParse(data)

    if (!result.success) {
      error(
        'schema-error',
        `content/${collection}/${file} frontmatter validation failed:\n    ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n    ')}`,
      )
    }
  }
}

for (const dir of contentDirs) {
  if (!Object.hasOwn(collectionSchemas, dir)) {
    error(
      'orphaned-dir',
      `content/${dir}/ exists but "${dir}" is not defined in collectionSchemas`,
    )
  }
}

// ---------------------------------------------------------------------------
// 3. Validate gallery images
// ---------------------------------------------------------------------------

console.log('Validating gallery images...')

interface GalleryImageRef {
  file: string
  imageFilename: string
  declaredWidth: number
  declaredHeight: number
  declaredColor: string
}

// Also collected here for section 4 below: each photo's (year, event) key
// alongside the location (if any) it records, so the per-edition location
// consistency check can run without re-parsing content/gallery/*.md.
interface PhotoLocationRef {
  file: string
  key: string
  event: string
  location: string | undefined
}
const photoLocationRefs: Array<PhotoLocationRef> = []

if (existsSync(GALLERY_DIR)) {
  const galleryFiles = readdirSync(GALLERY_DIR).filter((f) => f.endsWith('.md'))
  const imageRefs: Array<GalleryImageRef> = []

  for (const file of galleryFiles) {
    const filePath = join(GALLERY_DIR, file)
    const { data } = matter(readFileSync(filePath, 'utf-8'))
    const result = collectionSchemas.gallery.safeParse(data)

    // Schema errors are already reported in section 2 above.
    if (!result.success) continue

    const event = result.data.event ?? 'Misc'
    photoLocationRefs.push({
      file,
      key: `${result.data.date.getFullYear()}::${event}`,
      event,
      location:
        (result.data.location ?? '') === '' ? undefined : result.data.location,
    })

    const imageFilename = result.data.image
    const diskPath = join(GALLERY_DIR, imageFilename)

    if (!existsSync(diskPath)) {
      error(
        'dangling-image',
        `content/gallery/${file} references "${imageFilename}" but content/gallery/${imageFilename} does not exist`,
      )
      continue
    }

    imageRefs.push({
      file,
      imageFilename,
      declaredWidth: result.data.width,
      declaredHeight: result.data.height,
      declaredColor: result.data.color,
    })
  }

  const refsByImage = groupByKey(imageRefs, (ref) => ref.imageFilename)

  checkNoDuplicates(refsByImage, 'duplicate-image', (refs) => {
    const files = refs.map((ref) => ref.file)
    return `content/gallery/${refs[0]?.imageFilename} is referenced by ${refs.length} gallery entries (${files.join(', ')}) — each photo should have exactly one entry`
  })

  const galleryImageFiles = readdirSync(GALLERY_DIR).filter(
    (f) => !f.endsWith('.md'),
  )

  checkAllReferenced(
    galleryImageFiles,
    (imageFile) => imageFile,
    new Set(refsByImage.keys()),
    'orphaned-image',
    (imageFile) =>
      `content/gallery/${imageFile} is not referenced by any content/gallery entry`,
  )

  for (const imageFile of galleryImageFiles) {
    if (extname(imageFile).toLowerCase() !== '.webp') {
      error(
        'invalid-image-format',
        `content/gallery/${imageFile} is not a .webp file — run npm run images:optimize to convert it`,
      )
      continue
    }

    const metadata = await readImageMetadata(join(GALLERY_DIR, imageFile))

    if (metadata.width > IMAGE_MAX_PX || metadata.height > IMAGE_MAX_PX) {
      error(
        'oversized-image',
        `content/gallery/${imageFile} is ${metadata.width}x${metadata.height}px, exceeds the ${IMAGE_MAX_PX}px max — run npm run images:optimize to resize it`,
      )
    }

    // The lightbox swipe gesture uses the frontmatter's width/height/color
    // to render a same-shaped, same-tinted placeholder before the actual
    // photo bytes have loaded — so if it's ever out of sync with the real
    // file (a hand-replaced image, an entry added by hand through the CMS
    // without these fields, ...), that placeholder would look wrong.
    const ref = refsByImage.get(imageFile)?.[0]
    if (
      ref &&
      (ref.declaredWidth !== metadata.width ||
        ref.declaredHeight !== metadata.height ||
        ref.declaredColor !== metadata.color)
    ) {
      error(
        'image-metadata-mismatch',
        `content/gallery/${ref.file} declares width=${ref.declaredWidth} height=${ref.declaredHeight} color=${ref.declaredColor}, but content/gallery/${imageFile} is actually ${metadata.width}x${metadata.height} ${metadata.color} — run npm run gallery:sync-dimensions to fix`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Validate per-edition location consistency
//
// `location` is denormalized onto each photo, but it describes the edition
// (a year + event), not the individual shot — so every photo sharing a
// (year, event) that records a location must record the *same* one, or the
// group heading (which reads it off whichever photo happens to be first)
// would be ambiguous. Photos that leave location blank are fine — it's
// opt-in, and one photo in a group can carry the location for all of them.
// ---------------------------------------------------------------------------

console.log('Validating gallery edition locations...')

for (const [key, refs] of groupByKey(photoLocationRefs, (ref) => ref.key)) {
  const distinct = [
    ...new Set(
      refs
        .map((ref) => ref.location)
        .filter((location): location is string => location !== undefined),
    ),
  ]

  if (distinct.length > 1) {
    const [year, event] = key.split('::')
    const detail = refs
      .filter((ref) => ref.location !== undefined)
      .map((ref) => `${ref.file} → "${ref.location}"`)
      .join(', ')
    error(
      'inconsistent-location',
      `Photos from ${year} ${event} disagree on location (${detail}) — every photo in the same year + event must record the same location, since it names the edition, not the individual photo`,
    )
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('')

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error(s).`)
  process.exit(1)
} else {
  console.log('Content validation passed.')
}
