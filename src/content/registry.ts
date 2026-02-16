import { z } from 'zod'

/**
 * Content registry — single source of truth for all CMS-managed content.
 *
 * Adding/removing a key here immediately affects the type system:
 * - `PageKey` and `CollectionName` are derived union types
 * - `getPageContent()` only accepts valid `PageKey` values
 * - `getCollectionItems()` only accepts valid `CollectionName` values
 * - The validation script checks that files on disk match these keys
 */

// ---------------------------------------------------------------------------
// Singleton pages — each key maps to content/pages/{key}.md
// ---------------------------------------------------------------------------

export const pageSchemas = {
  homepage: z.object({
    hero_heading: z.string(),
    hero_heading_accent: z.string(),
    hero_subheading: z.string(),
    hero_description: z.string(),
    cta_text: z.string(),
    cta_subtext: z.string(),
  }),
  'event-info': z.object({
    danish_final_date: z.coerce.date(),
    danish_final_location: z.string(),
    danish_final_time: z.string(),
    world_final_location: z.string(),
  }),
} as const

export type PageKey = keyof typeof pageSchemas
export type PageContent<TKey extends PageKey> = z.infer<(typeof pageSchemas)[TKey]>

// ---------------------------------------------------------------------------
// Folder collections — each key maps to content/{key}/*.md
// ---------------------------------------------------------------------------

export const collectionSchemas = {
  blog: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
  carousel: z.object({
    image: z.string(),
    alt: z.string(),
    description: z.string().optional(),
    position: z.string().optional(),
    order: z.number().optional(),
  }),
} as const

export type CollectionName = keyof typeof collectionSchemas
export type CollectionItem<TCollection extends CollectionName> = z.infer<
  (typeof collectionSchemas)[TCollection]
> & { slug: string }
