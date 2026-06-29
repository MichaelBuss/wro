import matter from 'gray-matter'
import { marked } from 'marked'
import { collectionSchemas, pageSchemas } from '~/content/registry'
import type {
  CollectionItem,
  CollectionName,
  PageContent,
  PageKey,
} from '~/content/registry'
import { GlobAdapter } from './content-store'
import type { ContentStore } from './content-store'

// ---------------------------------------------------------------------------
// Core accessor factory — accepts any ContentStore (injectable for tests)
// ---------------------------------------------------------------------------

export function createContentAccessors(store: ContentStore) {
  function getPageContent(key: PageKey) {
    const raw = store.getRaw(`pages/${key}.md`)

    if (!raw) {
      throw new Error(`Content file not found: content/pages/${key}.md`)
    }

    const { data } = matter(raw)

    return pageSchemas[key].parse(data)
  }

  function getCollectionItems(collection: CollectionName) {
    const slugs = store.listSlugs(collection)

    if (slugs.length === 0) {
      return []
    }

    const schema = collectionSchemas[collection]

    return slugs.flatMap((slug) => {
      const raw = store.getRaw(`${collection}/${slug}.md`)

      if (!raw) {
        return []
      }

      const { data } = matter(raw)
      const parsed = schema.parse(data)

      return [{ ...parsed, slug }]
    })
  }

  function getCollectionItem(collection: CollectionName, slug: string) {
    const raw = store.getRaw(`${collection}/${slug}.md`)

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

  return { getPageContent, getCollectionItems, getCollectionItem }
}

// ---------------------------------------------------------------------------
// Production store — all Markdown under content/ inlined at build time.
// Runs identically in dev SSR and Netlify deploy without a runtime storage layer.
// ---------------------------------------------------------------------------

const prodStore = new GlobAdapter(
  import.meta.glob<string>('/content/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)

const prodAccessors = createContentAccessors(prodStore)

// ---------------------------------------------------------------------------
// Module-level exports with overloads for narrowed return types.
// (tsgo cannot infer them through generic indexed access on pageSchemas.)
// ---------------------------------------------------------------------------

export function getPageContent(key: 'homepage'): PageContent<'homepage'>
export function getPageContent(key: 'event-info'): PageContent<'event-info'>
export function getPageContent(key: 'prizes'): PageContent<'prizes'>
export function getPageContent(key: 'cost'): PageContent<'cost'>
export function getPageContent(key: 'materials'): PageContent<'materials'>
export function getPageContent(key: PageKey) {
  return prodAccessors.getPageContent(key)
}

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
  return prodAccessors.getCollectionItems(collection)
}

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
  return prodAccessors.getCollectionItem(collection, slug)
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
  return prodStore.listSlugs('blog')
}

export function getAllBlogPosts(): Array<BlogPostMeta> {
  const slugs = prodStore.listSlugs('blog')
  const blogSchema = collectionSchemas.blog

  const posts = slugs.flatMap((slug) => {
    const raw = prodStore.getRaw(`blog/${slug}.md`)

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
  const raw = prodStore.getRaw(`blog/${slug}.md`)

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
