import matter from 'gray-matter'
import { marked } from 'marked'
import { collectionSchemas, pageSchemas } from '~/content/registry'
import type {
  CollectionItem,
  CollectionName,
  PageContent,
  PageKey,
} from '~/content/registry'

/**
 * All markdown under `content/` is inlined into the server bundle at build time.
 * This runs in any server environment (dev SSR, Netlify build) without depending
 * on a server-runtime storage layer, so content loading behaves identically in
 * the framework SSR dev server and in the deployed function.
 */
const rawContentByPath = import.meta.glob<string>('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function readContent(relativePath: string): string | undefined {
  return rawContentByPath[`/content/${relativePath}`]
}

function listCollectionSlugs(collection: CollectionName): Array<string> {
  const prefix = `/content/${collection}/`

  return Object.keys(rawContentByPath)
    .filter((path) => path.startsWith(prefix) && path.endsWith('.md'))
    .map((path) => path.slice(prefix.length).replace(/\.md$/, ''))
}

// ---------------------------------------------------------------------------
// Generic typed accessors
// ---------------------------------------------------------------------------

/**
 * Load a singleton page by key. Validates frontmatter against the registry schema.
 * TypeScript enforces that `key` must be a valid PageKey.
 *
 * Overloads provide narrowed return types per key, since tsgo cannot infer
 * them through generic indexed access on `pageSchemas`.
 */
export function getPageContent(key: 'homepage'): PageContent<'homepage'>
export function getPageContent(key: 'event-info'): PageContent<'event-info'>
export function getPageContent(key: 'prizes'): PageContent<'prizes'>
export function getPageContent(key: 'cost'): PageContent<'cost'>
export function getPageContent(key: 'materials'): PageContent<'materials'>
export function getPageContent(key: PageKey) {
  const raw = readContent(`pages/${key}.md`)

  if (!raw) {
    throw new Error(`Content file not found: content/pages/${key}.md`)
  }

  const { data } = matter(raw)

  return pageSchemas[key].parse(data)
}

/**
 * Load all items in a folder collection. Validates each against its registry schema.
 * Returns items sorted by slug unless the schema includes an `order` field.
 */
export function getCollectionItems(
  collection: 'blog',
): Array<CollectionItem<'blog'>>
export function getCollectionItems(
  collection: 'carousel',
): Array<CollectionItem<'carousel'>>
export function getCollectionItems(
  collection: 'quotes',
): Array<CollectionItem<'quotes'>>
export function getCollectionItems(
  collection: 'practical-tips',
): Array<CollectionItem<'practical-tips'>>
export function getCollectionItems(collection: CollectionName) {
  const slugs = listCollectionSlugs(collection)

  if (slugs.length === 0) {
    return []
  }

  const schema = collectionSchemas[collection]

  return slugs.flatMap((slug) => {
    const raw = readContent(`${collection}/${slug}.md`)

    if (!raw) {
      return []
    }

    const { data } = matter(raw)
    const parsed = schema.parse(data)

    return [{ ...parsed, slug }]
  })
}

/**
 * Load a single item from a folder collection by slug.
 * Returns null if the file doesn't exist.
 */
export function getCollectionItem(
  collection: 'blog',
  slug: string,
): (CollectionItem<'blog'> & { content: string }) | null
export function getCollectionItem(
  collection: 'carousel',
  slug: string,
): (CollectionItem<'carousel'> & { content: string }) | null
export function getCollectionItem(
  collection: 'quotes',
  slug: string,
): (CollectionItem<'quotes'> & { content: string }) | null
export function getCollectionItem(
  collection: 'practical-tips',
  slug: string,
): (CollectionItem<'practical-tips'> & { content: string }) | null
export function getCollectionItem(collection: CollectionName, slug: string) {
  const raw = readContent(`${collection}/${slug}.md`)

  if (!raw) {
    return null
  }

  const { data, content } = matter(raw)
  const parsed = collectionSchemas[collection].parse(data)

  return {
    ...parsed,
    slug,
    content: marked(content, { async: false }),
  }
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

export function getBlogSlugs(): Array<string> {
  return listCollectionSlugs('blog')
}

export function getAllBlogPosts(): Array<BlogPostMeta> {
  const slugs = getBlogSlugs()

  const blogSchema = collectionSchemas.blog

  const posts = slugs.flatMap((slug) => {
    const raw = readContent(`blog/${slug}.md`)

    if (!raw) {
      return []
    }

    const { data } = matter(raw)
    const parsed = blogSchema.parse(data)

    return [
      {
        slug,
        title: parsed.title || slug,
        date: parsed.date.toISOString(),
        description: parsed.description,
        image: parsed.image,
      },
    ]
  })

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export function getBlogPost(slug: string): BlogPost | null {
  const raw = readContent(`blog/${slug}.md`)

  if (!raw) {
    return null
  }

  const { data, content } = matter(raw)
  const parsed = collectionSchemas.blog.parse(data)

  return {
    slug,
    title: parsed.title || slug,
    date: parsed.date.toISOString(),
    description: parsed.description,
    image: parsed.image,
    content: marked(content, { async: false }),
  }
}
