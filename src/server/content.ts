import matter from 'gray-matter'
import { marked } from 'marked'
import { useStorage } from 'nitro/storage'
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

function getContentStorage() {
  return useStorage('assets:content')
}

// ---------------------------------------------------------------------------
// Generic typed accessors
// ---------------------------------------------------------------------------

/**
 * Load a singleton page by key. Validates frontmatter against the registry schema.
 * TypeScript enforces that `key` must be a valid PageKey.
 */
export async function getPageContent<TKey extends PageKey>(key: TKey): Promise<PageContent<TKey>> {
  const storage = getContentStorage()
  const raw = await storage.getItemRaw<string>(`pages:${key}.md`)

  if (!raw) {
    throw new Error(`Content file not found: content/pages/${key}.md`)
  }

  const { data } = matter(String(raw))

  return pageSchemas[key].parse(data) as PageContent<TKey>
}

/**
 * Load all items in a folder collection. Validates each against its registry schema.
 * Returns items sorted by slug unless the schema includes an `order` field.
 */
export async function getCollectionItems<TCollection extends CollectionName>(
  collection: TCollection,
): Promise<Array<CollectionItem<TCollection>>> {
  const storage = getContentStorage()
  const allKeys = await storage.getKeys(collection)
  const mdKeys = allKeys.filter((key) => key.endsWith('.md'))

  if (mdKeys.length === 0) {
    return []
  }

  const schema = collectionSchemas[collection]

  const items = await Promise.all(
    mdKeys.map(async (key) => {
      const slug = key.replace(`${collection}:`, '').replace(/\.md$/, '')
      const raw = await storage.getItemRaw<string>(key)
      const { data } = matter(String(raw))
      const parsed = schema.parse(data)

      return { ...parsed, slug } as CollectionItem<TCollection>
    }),
  )

  return items
}

/**
 * Load a single item from a folder collection by slug.
 * Returns null if the file doesn't exist.
 */
export async function getCollectionItem<TCollection extends CollectionName>(
  collection: TCollection,
  slug: string,
): Promise<(CollectionItem<TCollection> & { content: string }) | null> {
  const storage = getContentStorage()
  const raw = await storage.getItemRaw<string>(`${collection}:${slug}.md`)

  if (!raw) {
    return null
  }

  const { data, content } = matter(String(raw))
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

export async function getBlogSlugs(): Promise<Array<string>> {
  const storage = getContentStorage()
  const keys = await storage.getKeys('blog')

  return keys
    .filter((key) => key.endsWith('.md'))
    .map((key) => key.replace('blog:', '').replace(/\.md$/, ''))
}

export async function getAllBlogPosts(): Promise<Array<BlogPostMeta>> {
  const storage = getContentStorage()
  const slugs = await getBlogSlugs()

  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const raw = await storage.getItemRaw<string>(`blog:${slug}.md`)
      const { data } = matter(String(raw))

      return {
        slug,
        title: (data.title as string) || slug,
        date: data.date ? new Date(data.date as string).toISOString() : '',
        description: data.description as string | undefined,
        image: data.image as string | undefined,
      }
    }),
  )

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const storage = getContentStorage()
  const raw = await storage.getItemRaw<string>(`blog:${slug}.md`)

  if (!raw) {
    return null
  }

  const { data, content } = matter(String(raw))

  return {
    slug,
    title: (data.title as string) || slug,
    date: data.date ? new Date(data.date as string).toISOString() : '',
    description: data.description as string | undefined,
    image: data.image as string | undefined,
    content: marked(content) as string,
  }
}
