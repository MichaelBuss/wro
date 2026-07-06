/**
 * Shared image transformation settings.
 *
 * Single source of truth for both the CLI optimizer (optimize-images.ts) and
 * Sveltia CMS's in-browser transformation (public/cms/config.yml), so the
 * two never drift apart. If you change these values, update the matching
 * comments in config.yml too.
 */

export const IMAGE_QUALITY = 85
export const IMAGE_MAX_PX = 2048
export const IMAGE_FORMAT = 'webp' as const
