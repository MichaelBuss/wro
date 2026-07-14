/**
 * Content Validation Script
 *
 * Ensures bidirectional consistency between the content registry and files on disk:
 * - Every singleton page key in the registry has a corresponding .md file
 * - Every .md file in content/pages/ has a corresponding registry key
 * - Every collection key in the registry has a corresponding directory
 * - Every directory in content/ (except pages/) has a corresponding collection key
 * - All frontmatter validates against its Zod schema
 * - Every gallery photo's image exists in public/uploads, and every upload is
 *   referenced by exactly one photo (no orphans, no duplicates), at the
 *   right format/size
 * - Every gallery-editions entry matches at least one real photo's
 *   (year, event), with no two editions claiming the same pairing
 *
 * Run with: npm run validate:content
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import matter from 'gray-matter'
import sharp from 'sharp'
import { collectionSchemas, pageSchemas } from '../src/content/registry'
import { objectKeys } from '../src/lib/utils'
import { slugifyEvent } from './gallery-editions'
import { IMAGE_MAX_PX } from './image-settings'

const CONTENT_DIR = join(process.cwd(), 'content')
const PAGES_DIR = join(CONTENT_DIR, 'pages')
const GALLERY_DIR = join(CONTENT_DIR, 'gallery')
const EDITIONS_DIR = join(CONTENT_DIR, 'gallery-editions')
const PUBLIC_DIR = join(process.cwd(), 'public')
const UPLOADS_DIR = join(PUBLIC_DIR, 'uploads')

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
    | 'orphaned-edition'
    | 'duplicate-edition'
    | 'edition-filename-mismatch'
  message: string
}

const errors: Array<ValidationError> = []

function error(type: ValidationError['type'], message: string) {
  errors.push({ type, message })
  console.error(`  ERROR: ${message}`)
}

/**
 * Groups items by a derived string key. Shared building block for both the
 * gallery-images and gallery-editions consistency checks below, so "group by
 * key, then check the group" logic can't drift between the two.
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
// 3. Validate gallery images stay in sync with public/uploads
//
// Every gallery entry must point at a file that exists, every upload must be
// referenced by exactly one entry (no orphans, no duplicates), and every
// upload must already be a correctly-sized .webp — catching anything that
// bypassed npm run images:optimize / the CMS's browser-side transform (e.g.
// a raw photo committed by hand).
// ---------------------------------------------------------------------------

console.log('Validating gallery images...')

interface GalleryImageRef {
  file: string
  uploadFilename: string
}

// Also collected here for section 4 below: every valid photo's derived
// (year, event) key, so editions can be checked against real photos without
// re-parsing content/gallery/*.md a second time.
const photoEditionKeys = new Set<string>()

if (existsSync(GALLERY_DIR)) {
  const galleryFiles = readdirSync(GALLERY_DIR).filter((f) => f.endsWith('.md'))
  const imageRefs: Array<GalleryImageRef> = []

  for (const file of galleryFiles) {
    const filePath = join(GALLERY_DIR, file)
    const { data } = matter(readFileSync(filePath, 'utf-8'))
    const result = collectionSchemas.gallery.safeParse(data)

    // Schema errors are already reported in section 2 above.
    if (!result.success) continue

    photoEditionKeys.add(
      `${result.data.date.getFullYear()}::${result.data.event ?? 'Misc'}`,
    )

    const uploadFilename = result.data.image.replace(/^\/uploads\//, '')
    const diskPath = join(UPLOADS_DIR, uploadFilename)

    if (!existsSync(diskPath)) {
      error(
        'dangling-image',
        `content/gallery/${file} references "${result.data.image}" but public/uploads/${uploadFilename} does not exist`,
      )
      continue
    }

    imageRefs.push({ file, uploadFilename })
  }

  const refsByUpload = groupByKey(imageRefs, (ref) => ref.uploadFilename)

  checkNoDuplicates(refsByUpload, 'duplicate-image', (refs) => {
    const files = refs.map((ref) => ref.file)
    return `public/uploads/${refs[0]?.uploadFilename} is referenced by ${refs.length} gallery entries (${files.join(', ')}) — each photo should have exactly one entry`
  })

  if (existsSync(UPLOADS_DIR)) {
    const uploadFiles = readdirSync(UPLOADS_DIR)

    checkAllReferenced(
      uploadFiles,
      (uploadFile) => uploadFile,
      new Set(refsByUpload.keys()),
      'orphaned-image',
      (uploadFile) =>
        `public/uploads/${uploadFile} is not referenced by any content/gallery entry`,
    )

    for (const uploadFile of uploadFiles) {
      if (extname(uploadFile).toLowerCase() !== '.webp') {
        error(
          'invalid-image-format',
          `public/uploads/${uploadFile} is not a .webp file — run npm run images:optimize to convert it`,
        )
        continue
      }

      const { width, height } = await sharp(
        join(UPLOADS_DIR, uploadFile),
      ).metadata()

      if (width > IMAGE_MAX_PX || height > IMAGE_MAX_PX) {
        error(
          'oversized-image',
          `public/uploads/${uploadFile} is ${width}x${height}px, exceeds the ${IMAGE_MAX_PX}px max — run npm run images:optimize to resize it`,
        )
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Validate gallery editions match real photos
//
// Editions aren't referenced by photos explicitly — they're matched purely
// by (year, event), the same way public/uploads files are matched by
// filename in section 3. So an edition is "orphaned" the same way an upload
// can be: it exists but nothing points at it, either because the year/event
// was mistyped or the photos it described got re-dated/re-tagged since.
// ---------------------------------------------------------------------------

console.log('Validating gallery editions...')

if (existsSync(EDITIONS_DIR)) {
  interface EditionRef {
    file: string
    year: number
    event: string
    key: string
  }

  const editionFiles = readdirSync(EDITIONS_DIR).filter((f) =>
    f.endsWith('.md'),
  )
  const editionRefs: Array<EditionRef> = []

  for (const file of editionFiles) {
    const filePath = join(EDITIONS_DIR, file)
    const { data } = matter(readFileSync(filePath, 'utf-8'))
    const result = collectionSchemas['gallery-editions'].safeParse(data)

    // Schema errors are already reported in section 2 above.
    if (!result.success) continue

    const { year, event } = result.data
    editionRefs.push({ file, year, event, key: `${year}::${event}` })

    const expectedFile = `${year}-${slugifyEvent(event)}.md`
    if (file !== expectedFile) {
      error(
        'edition-filename-mismatch',
        `content/gallery-editions/${file} has year "${year}" + event "${event}" in its frontmatter, but its filename doesn't match (expected ${expectedFile}) — likely hand-edited after creation`,
      )
    }
  }

  checkNoDuplicates(
    groupByKey(editionRefs, (ref) => ref.key),
    'duplicate-edition',
    (refs) => {
      const files = refs.map((ref) => ref.file)
      return `Multiple gallery-editions entries declare year "${refs[0]?.year}" + event "${refs[0]?.event}" (${files.join(', ')}) — only one location can win`
    },
  )

  checkAllReferenced(
    editionRefs,
    (ref) => ref.key,
    photoEditionKeys,
    'orphaned-edition',
    (ref) =>
      `content/gallery-editions/${ref.file} declares year "${ref.year}" + event "${ref.event}" but no gallery photo has that year/event`,
  )
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
