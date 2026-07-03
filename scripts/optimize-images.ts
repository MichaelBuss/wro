/**
 * Image Optimizer
 *
 * Converts source images to WebP, applying the same transformation Sveltia
 * CMS runs in the browser before committing an upload (see
 * public/admin/config.yml and image-settings.ts).
 *
 * Run with: npm run images:optimize path/to/photo1.jpg path/to/photo2.jpg
 * Outputs: public/uploads/photo1.webp, public/uploads/photo2.webp
 */

import { existsSync, mkdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'
import { IMAGE_MAX_PX, IMAGE_QUALITY } from './image-settings'

const OUTPUT_DIR = 'public/uploads'

async function main() {
  const inputPaths = process.argv.slice(2)

  if (inputPaths.length === 0) {
    console.error('Usage: npm run images:optimize <path> [path...]')
    process.exitCode = 1
    return
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const inputPath of inputPaths) {
    const name = basename(inputPath, extname(inputPath))
    const outputPath = join(OUTPUT_DIR, `${name}.webp`)

    await sharp(inputPath)
      .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_QUALITY })
      .toFile(outputPath)

    console.log(`${inputPath} → ${outputPath}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
