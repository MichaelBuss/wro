import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import {
  collectionSchemas,
  pageSchemas,
} from '~/content/registry'
import type {
  CollectionItem,
  CollectionName,
  PageContent,
  PageKey,
} from '~/content/registry'

const CONTENT_DIR = path.join(process.cwd(), 'content')

// ---------------------------------------------------------------------------
// Generic typed accessors
// ---------------------------------------------------------------------------

/**
 * Load a singleton page by key. Validates frontmatter against the registry schema.
 * TypeScript enforces that `key` must be a valid PageKey.
 */
export function getPageContent<TKey extends PageKey>(key: TKey): PageContent<TKey> {
  const filePath = path.join(CONTENT_DIR, 'pages', `${key}.md`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Content file not found: content/pages/${key}.md`)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(fileContent)

  return pageSchemas[key].parse(data) as PageContent<TKey>
}

/**
 * Load all items in a folder collection. Validates each against its registry schema.
 * Returns items sorted by slug unless the schema includes an `order` field.
 */
export function getCollectionItems<TCollection extends CollectionName>(
  collection: TCollection,
): Array<CollectionItem<TCollection>> {
  const collectionDir = path.join(CONTENT_DIR, collection)

  if (!fs.existsSync(collectionDir)) {
    return []
  }

  const files = fs
    .readdirSync(collectionDir)
    .filter((file) => file.endsWith('.md'))

  const schema = collectionSchemas[collection]

  const items = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const filePath = path.join(collectionDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(fileContent)
    const parsed = schema.parse(data)

    return { ...parsed, slug } as CollectionItem<TCollection>
  })

  return items
}

/**
 * Load a single item from a folder collection by slug.
 * Returns null if the file doesn't exist.
 */
export function getCollectionItem<TCollection extends CollectionName>(
  collection: TCollection,
  slug: string,
): (CollectionItem<TCollection> & { content: string }) | null {
  const filePath = path.join(CONTENT_DIR, collection, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  const schema = collectionSchemas[collection]
  const parsed = schema.parse(data)

  return {
    ...parsed,
    slug,
    content: marked(content) as string,
  } as CollectionItem<TCollection> & { content: string }
}

// ---------------------------------------------------------------------------
// Blog-specific accessors (preserved for backwards compatibility)
// ---------------------------------------------------------------------------

export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  description?: string
  image?: string
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

const BLOG_DIR = path.join(CONTENT_DIR, 'blog')

export function getBlogSlugs(): Array<string> {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
}

export function getAllBlogPosts(): Array<BlogPostMeta> {
  const slugs = getBlogSlugs()

  const posts = slugs
    .map((slug) => {
      const filePath = path.join(BLOG_DIR, `${slug}.md`)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)

      return {
        slug,
        title: data.title || slug,
        date: data.date ? new Date(data.date).toISOString() : '',
        description: data.description,
        image: data.image,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)

  return {
    slug,
    title: data.title || slug,
    date: data.date ? new Date(data.date).toISOString() : '',
    description: data.description,
    image: data.image,
    content: marked(content) as string,
  }
}
