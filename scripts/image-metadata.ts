/**
 * Shared sharp helper for reading a gallery photo's width/height and a
 * placeholder color straight off the file — the single source of truth for
 * scripts/optimize-images.ts (computed once, at import time),
 * scripts/sync-gallery-dimensions.ts (recomputed for backfills/repairs), and
 * scripts/validate-content.ts (recomputed to check frontmatter hasn't
 * drifted from the actual file).
 */

import sharp from 'sharp'

export interface ImageMetadata {
  width: number
  height: number
  /**
   * Dominant color as `#rrggbb`, from sharp's histogram-based `stats()` —
   * cheap to compute from a file already being read for its dimensions, and
   * a good enough loading-placeholder swatch without a new dependency.
   */
  color: string
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, '0')
}

export async function readImageMetadata(
  filePath: string,
): Promise<ImageMetadata> {
  const [{ width, height }, { dominant }] = await Promise.all([
    sharp(filePath).metadata(),
    sharp(filePath).stats(),
  ])

  return {
    width,
    height,
    color: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
  }
}
