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
 *
 * Run with: npm run validate:content
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import matter from 'gray-matter'
import sharp from 'sharp'
import { collectionSchemas, pageSchemas } from '../src/content/registry'
import { objectKeys } from '../src/lib/utils'
import { IMAGE_MAX_PX } from './image-settings'

const CONTENT_DIR = join(process.cwd(), 'content')
const PAGES_DIR = join(CONTENT_DIR, 'pages')
const GALLERY_DIR = join(CONTENT_DIR, 'gallery')
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
  message: string
}

const errors: Array<ValidationError> = []

function error(type: ValidationError['type'], message: string) {
  errors.push({ type, message })
  console.error(`  ERROR: ${message}`)
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

if (existsSync(GALLERY_DIR)) {
  const galleryFiles = readdirSync(GALLERY_DIR).filter((f) => f.endsWith('.md'))

  // Upload filename (e.g. "DSC_1689.webp") -> gallery .md files referencing it.
  const referencingFiles = new Map<string, Array<string>>()

  for (const file of galleryFiles) {
    const filePath = join(GALLERY_DIR, file)
    const { data } = matter(readFileSync(filePath, 'utf-8'))
    const result = collectionSchemas.gallery.safeParse(data)

    // Schema errors are already reported in section 2 above.
    if (!result.success) continue

    const uploadFilename = result.data.image.replace(/^\/uploads\//, '')
    const diskPath = join(UPLOADS_DIR, uploadFilename)

    if (!existsSync(diskPath)) {
      error(
        'dangling-image',
        `content/gallery/${file} references "${result.data.image}" but public/uploads/${uploadFilename} does not exist`,
      )
      continue
    }

    const referencedBy = referencingFiles.get(uploadFilename) ?? []
    referencedBy.push(file)
    referencingFiles.set(uploadFilename, referencedBy)
  }

  for (const [uploadFilename, files] of referencingFiles) {
    if (files.length > 1) {
      error(
        'duplicate-image',
        `public/uploads/${uploadFilename} is referenced by ${files.length} gallery entries (${files.join(', ')}) — each photo should have exactly one entry`,
      )
    }
  }

  if (existsSync(UPLOADS_DIR)) {
    const uploadFiles = readdirSync(UPLOADS_DIR)

    for (const uploadFile of uploadFiles) {
      if (!referencingFiles.has(uploadFile)) {
        error(
          'orphaned-image',
          `public/uploads/${uploadFile} is not referenced by any content/gallery entry`,
        )
      }

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
// Summary
// ---------------------------------------------------------------------------

console.log('')

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error(s).`)
  process.exit(1)
} else {
  console.log('Content validation passed.')
}
