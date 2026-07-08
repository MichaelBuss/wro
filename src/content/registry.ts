import { z } from 'zod'

export const OBJECT_POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top center',
  'top right',
  'center left',
  'center right',
  'bottom left',
  'bottom center',
  'bottom right',
] as const

export type ObjectPosition = (typeof OBJECT_POSITIONS)[number]

export const GALLERY_EVENTS = [
  'Danish Final',
  'World Final',
  'Panic Weekend',
  'Misc',
] as const

export type GalleryEvent = (typeof GALLERY_EVENTS)[number]

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
  prizes: z.object({
    prizes: z
      .array(
        z.object({
          label: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .min(1),
    tip_heading: z.string(),
    tip_body: z.string(),
  }),
  cost: z.object({
    headline: z.string(),
    tagline: z.string(),
    homepage_tags: z.array(z.string()),
    free_items: z.array(z.string()),
    expenses: z.array(
      z.object({
        amount: z.string(),
        description: z.string(),
      }),
    ),
    tip_heading: z.string(),
    tip_body: z.string(),
    support_heading: z.string(),
    support_body: z.string(),
  }),
  materials: z.object({
    intro: z.string(),
    kits: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        recommended: z.boolean(),
      }),
    ),
    other_items: z.array(z.string()),
    rules_url: z.string(),
  }),
} as const

export type PageKey = keyof typeof pageSchemas
export type PageContent<TKey extends PageKey> = z.infer<
  (typeof pageSchemas)[TKey]
>

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
  gallery: z.object({
    image: z.string(),
    alt: z.string(),
    description: z.string().optional(),
    position: z.enum(OBJECT_POSITIONS).optional(),
    order: z.number().optional(),
    year: z.number().optional(),
    event: z.enum(GALLERY_EVENTS).optional(),
    favorite: z.boolean().optional(),
  }),
  quotes: z.object({
    quote: z.string(),
    author: z.string(),
    team: z.string(),
    order: z.number(),
  }),
  'practical-tips': z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
} as const

export type CollectionName = keyof typeof collectionSchemas
export type CollectionItem<TCollection extends CollectionName> = z.infer<
  (typeof collectionSchemas)[TCollection]
> & { slug: string }
