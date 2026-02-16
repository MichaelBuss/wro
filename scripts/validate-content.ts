/**
 * Content Validation Script
 *
 * Ensures bidirectional consistency between the content registry and files on disk:
 * - Every singleton page key in the registry has a corresponding .md file
 * - Every .md file in content/pages/ has a corresponding registry key
 * - Every collection key in the registry has a corresponding directory
 * - Every directory in content/ (except pages/) has a corresponding collection key
 * - All frontmatter validates against its Zod schema
 *
 * Run with: npm run validate:content
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { collectionSchemas, pageSchemas } from '../src/content/registry'

const CONTENT_DIR = join(process.cwd(), 'content')
const PAGES_DIR = join(CONTENT_DIR, 'pages')

interface ValidationError {
  type: 'missing-file' | 'orphaned-file' | 'missing-dir' | 'orphaned-dir' | 'schema-error'
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

const registeredPages = Object.keys(pageSchemas) as Array<keyof typeof pageSchemas>
const pageFilesOnDisk = existsSync(PAGES_DIR)
  ? readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  : []

for (const key of registeredPages) {
  const filePath = join(PAGES_DIR, `${key}.md`)

  if (!existsSync(filePath)) {
    error('missing-file', `Registry defines page "${key}" but content/pages/${key}.md does not exist`)
    continue
  }

  const fileContent = readFileSync(filePath, 'utf-8')
  const { data } = matter(fileContent)
  const schema = pageSchemas[key]
  const result = schema.safeParse(data)

  if (!result.success) {
    error('schema-error', `content/pages/${key}.md frontmatter validation failed:\n    ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n    ')}`)
  }
}

for (const file of pageFilesOnDisk) {
  if (!registeredPages.includes(file as keyof typeof pageSchemas)) {
    error('orphaned-file', `content/pages/${file}.md exists but "${file}" is not defined in pageSchemas`)
  }
}

// ---------------------------------------------------------------------------
// 2. Validate folder collections
// ---------------------------------------------------------------------------

console.log('Validating folder collections...')

const registeredCollections = Object.keys(collectionSchemas) as Array<keyof typeof collectionSchemas>

const contentDirs = existsSync(CONTENT_DIR)
  ? readdirSync(CONTENT_DIR).filter((entry) => {
      const fullPath = join(CONTENT_DIR, entry)
      return statSync(fullPath).isDirectory() && entry !== 'pages'
    })
  : []

for (const collection of registeredCollections) {
  const collectionDir = join(CONTENT_DIR, collection)

  if (!existsSync(collectionDir)) {
    error('missing-dir', `Registry defines collection "${collection}" but content/${collection}/ does not exist`)
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
      error('schema-error', `content/${collection}/${file} frontmatter validation failed:\n    ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n    ')}`)
    }
  }
}

for (const dir of contentDirs) {
  if (!registeredCollections.includes(dir as keyof typeof collectionSchemas)) {
    error('orphaned-dir', `content/${dir}/ exists but "${dir}" is not defined in collectionSchemas`)
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
