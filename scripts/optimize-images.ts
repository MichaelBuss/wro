/**
 * Image Optimizer
 *
 * Converts source images to WebP, applying the same transformation Sveltia
 * CMS runs in the browser before committing an upload (see
 * public/cms/config.yml and image-settings.ts).
 *
 * Run with: npm run images:optimize path/to/photo1.jpg path/to/photo2.jpg
 * Outputs: public/uploads/photo1.webp, public/uploads/photo2.webp
 */

import { existsSync, mkdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'
import { IMAGE_MAX_PX, IMAGE_QUALITY } from './image-settings'

const OUTPUT_DIR = 'public/uploads'

export interface OptimizedImage {
  slug: string
  outputPath: string
}

/**
 * Converts a single source image to WebP, applying the shared
 * IMAGE_QUALITY/IMAGE_MAX_PX transformation. Shared by the CLI entrypoint
 * below and scripts/add-gallery-photos.ts, which passes the photo's own
 * entry folder as `outputDir` instead of the default `public/uploads`
 * (gallery images are co-located with their entry, not uploaded globally).
 */
export async function optimizeImage(
  inputPath: string,
  outputDir: string = OUTPUT_DIR,
): Promise<OptimizedImage> {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const slug = basename(inputPath, extname(inputPath))
  const outputPath = join(outputDir, `${slug}.webp`)

  await sharp(inputPath)
    .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: IMAGE_QUALITY })
    .toFile(outputPath)

  return { slug, outputPath }
}

async function main() {
  const inputPaths = process.argv.slice(2)

  if (inputPaths.length === 0) {
    console.error('Usage: npm run images:optimize <path> [path...]')
    process.exitCode = 1
    return
  }

  for (const inputPath of inputPaths) {
    const { outputPath } = await optimizeImage(inputPath)
    console.log(`${inputPath} → ${outputPath}`)
  }
}

// Only auto-run when executed directly (e.g. via `npm run images:optimize`),
// not when imported for its `optimizeImage()` export (e.g. by
// add-gallery-photos.ts) — otherwise the importer's own argv would be
// misinterpreted as this script's CLI input paths.
const isMain = import.meta.url === `file://${process.argv[1]}`

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
