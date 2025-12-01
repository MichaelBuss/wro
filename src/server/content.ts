import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

// Type definitions for blog posts
export interface BlogPostMeta {
  slug: string
  title: string
  date: string
  description?: string
  image?: string
}

export interface BlogPost extends BlogPostMeta {
  content: string // HTML content
}

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

/**
 * Get all blog post slugs (filenames without .md extension)
 */
export function getBlogSlugs(): Array<string> {
  if (!fs.existsSync(BLOG_DIR)) {
    return []
  }

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
}

/**
 * Get metadata for all blog posts (for listing pages)
 */
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

/**
 * Get a single blog post by slug (includes full HTML content)
 */
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

