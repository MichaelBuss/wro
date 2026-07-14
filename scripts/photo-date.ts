/**
 * Photo Capture Date Reader
 *
 * Extracts a photo's "date taken" from its EXIF metadata (preferring
 * `DateTimeOriginal`, falling back to `DateTime`), so gallery imports can
 * sort and group photos chronologically instead of by filename. Falls back
 * to the file's mtime when no usable EXIF date is present — flagged via
 * `source` so callers can warn the user.
 *
 * Must run against the *source* image, before scripts/optimize-images.ts
 * strips metadata on the way to WebP — the committed .webp never carries
 * EXIF (by design: smaller files, no leaked GPS/camera data).
 */

import { statSync } from 'node:fs'
import exifReader from 'exif-reader'
import sharp from 'sharp'

export interface PhotoDate {
  date: Date
  source: 'exif' | 'mtime'
}

function readExifDate(exif: Buffer): Date | undefined {
  try {
    const tags = exifReader(exif)
    const candidate = tags.Photo?.DateTimeOriginal ?? tags.Image?.DateTime
    return candidate instanceof Date && !Number.isNaN(candidate.getTime())
      ? candidate
      : undefined
  } catch {
    // Malformed EXIF block — treated the same as "no EXIF date".
    return undefined
  }
}

export async function readPhotoDate(inputPath: string): Promise<PhotoDate> {
  const { exif } = await sharp(inputPath).metadata()
  const exifDate = exif ? readExifDate(exif) : undefined

  if (exifDate) {
    return { date: exifDate, source: 'exif' }
  }

  return { date: statSync(inputPath).mtime, source: 'mtime' }
}

/** Formats a `Date` as `YYYY-MM-DD` using its local calendar fields. */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
