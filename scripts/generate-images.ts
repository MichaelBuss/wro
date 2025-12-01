/**
 * Responsive Image Generator
 *
 * This script:
 * 1. Auto-discovers all subfolders in assets/images/
 * 2. Generates optimized WebP versions at multiple sizes
 * 3. Skips generation if outputs already exist and are up-to-date
 * 4. Creates a TypeScript manifest with srcset support
 *
 * Run with: npm run images:generate
 * Force regenerate: npm run images:generate -- --force
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

// Directories
const SOURCE_DIR = 'assets/images'
const OUTPUT_DIR = 'public/images'
const MANIFEST_PATH = 'src/lib/images/manifest.generated.ts'

// Image processing config
const SOURCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.avif', '.tiff']
const OUTPUT_EXTENSION = '.webp'

// Responsive breakpoints (widths in pixels)
const IMAGE_WIDTHS = [640, 1024, 1280, 1920] as const

// WebP quality settings
const WEBP_OPTIONS: sharp.WebpOptions = {
  quality: 80,
  effort: 6, // Higher = smaller file, slower encode (0-6)
}

// Folders to ignore
const IGNORED_FOLDERS = ['admin', '.DS_Store']

// Parse CLI args
const FORCE_REGENERATE = process.argv.includes('--force')

interface GeneratedImage {
  width: number
  filename: string
  size: number
}

interface ImageResult {
  name: string // base filename without extension
  images: Array<GeneratedImage>
  skipped: boolean
}

interface FolderResult {
  name: string
  images: Array<ImageResult>
}

async function main() {
  console.log('🖼️  Responsive Image Generator\n')

  if (FORCE_REGENERATE) {
    console.log('⚡ Force mode: regenerating all images\n')
  }

  // Ensure source directory exists
  if (!existsSync(SOURCE_DIR)) {
    mkdirSync(SOURCE_DIR, { recursive: true })
    console.log(`📁 Created ${SOURCE_DIR}/`)
    console.log('   Add your source images here in subfolders (e.g., carousel/, gallery/)')
    return
  }

  // Find all subfolders in source
  const entries = readdirSync(SOURCE_DIR)
  const subfolders = entries.filter((entry) => {
    const fullPath = join(SOURCE_DIR, entry)
    return (
      statSync(fullPath).isDirectory() &&
      !IGNORED_FOLDERS.includes(entry) &&
      !entry.startsWith('.')
    )
  })

  if (subfolders.length === 0) {
    console.log(`⚠️  No image subfolders found in ${SOURCE_DIR}/`)
    console.log('   Create folders like: carousel/, gallery/, sponsors/')
    return
  }

  console.log(`Found ${subfolders.length} image folder(s): ${subfolders.join(', ')}\n`)

  // Process each folder
  const results: Array<FolderResult> = []
  let totalGenerated = 0
  let totalSkipped = 0

  for (const folder of subfolders) {
    const sourceFolderPath = join(SOURCE_DIR, folder)
    const outputFolderPath = join(OUTPUT_DIR, folder)

    // Ensure output folder exists
    if (!existsSync(outputFolderPath)) {
      mkdirSync(outputFolderPath, { recursive: true })
    }

    const folderResult = await processFolder(folder, sourceFolderPath, outputFolderPath)
    if (folderResult.images.length > 0) {
      results.push(folderResult)

      // Count stats
      for (const img of folderResult.images) {
        if (img.skipped) {
          totalSkipped++
        } else {
          totalGenerated++
        }
      }
    }
  }

  // Generate TypeScript manifest
  const manifest = generateManifest(results)
  writeFileSync(MANIFEST_PATH, manifest)
  console.log(`\n📝 Generated ${MANIFEST_PATH}`)

  console.log('\n✨ Done!')
  console.log(`   Generated: ${totalGenerated} image(s)`)
  console.log(`   Skipped (up-to-date): ${totalSkipped} image(s)`)

  if (totalGenerated > 0) {
    console.log('\n💡 If you added new images, update ALT_TEXTS in src/lib/images/alt-texts.ts')
  }
}

async function processFolder(
  folderName: string,
  sourcePath: string,
  outputPath: string,
): Promise<FolderResult> {
  console.log(`📂 ${folderName}/`)

  // Find source images
  const allFiles = readdirSync(sourcePath)
  const sourceFiles = allFiles.filter((file) => {
    const ext = extname(file).toLowerCase()
    return SOURCE_EXTENSIONS.includes(ext)
  })

  if (sourceFiles.length === 0) {
    console.log(`   ⚠️  No source images found`)
    return { name: folderName, images: [] }
  }

  const imageResults: Array<ImageResult> = []

  for (const sourceFile of sourceFiles) {
    const sourceFilePath = join(sourcePath, sourceFile)
    const filenameWithoutExt = basename(sourceFile, extname(sourceFile))

    const result = await processImage(filenameWithoutExt, sourceFilePath, outputPath)
    imageResults.push(result)
  }

  // Sort by filename for consistent output
  imageResults.sort((a, b) => a.name.localeCompare(b.name))

  return { name: folderName, images: imageResults }
}

async function processImage(
  baseName: string,
  sourcePath: string,
  outputDir: string,
): Promise<ImageResult> {
  const sourceStats = statSync(sourcePath)
  const sourceMtime = sourceStats.mtimeMs

  // Check if all outputs exist and are newer than source
  const outputPaths = IMAGE_WIDTHS.map((w) => ({
    width: w,
    path: join(outputDir, `${baseName}-${w}${OUTPUT_EXTENSION}`),
  }))

  const needsRegeneration =
    FORCE_REGENERATE ||
    outputPaths.some(({ path }) => {
      if (!existsSync(path)) return true
      const outputMtime = statSync(path).mtimeMs
      return sourceMtime > outputMtime
    })

  if (!needsRegeneration) {
    console.log(`   ⏭️  ${baseName} (up-to-date)`)
    // Return existing file info
    const images = outputPaths.map(({ width, path }) => ({
      width,
      filename: `${baseName}-${width}`,
      size: statSync(path).size,
    }))
    return { name: baseName, images, skipped: true }
  }

  // Load source image once
  const sourceImage = sharp(sourcePath)
  const metadata = await sourceImage.metadata()
  const sourceWidth = metadata.width || 1920

  console.log(`   🔄 ${baseName} (${metadata.width}×${metadata.height})`)

  const generatedImages: Array<GeneratedImage> = []

  for (const targetWidth of IMAGE_WIDTHS) {
    const outputFilename = `${baseName}-${targetWidth}`
    const outputPath = join(outputDir, `${outputFilename}${OUTPUT_EXTENSION}`)

    // Don't upscale — use source width if smaller than target
    const finalWidth = Math.min(targetWidth, sourceWidth)

    try {
      const { size } = await sharp(sourcePath)
        .resize(finalWidth, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp(WEBP_OPTIONS)
        .toFile(outputPath)

      generatedImages.push({
        width: targetWidth,
        filename: outputFilename,
        size,
      })

      const sizeKB = Math.round(size / 1024)
      console.log(`      → ${outputFilename}${OUTPUT_EXTENSION} (${finalWidth}w, ${sizeKB}KB)`)
    } catch (error) {
      console.error(`      ❌ Failed to generate ${outputFilename}:`, error)
    }
  }

  return { name: baseName, images: generatedImages, skipped: false }
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function generateManifest(results: Array<FolderResult>): string {
  // Sort results by folder name
  results.sort((a, b) => a.name.localeCompare(b.name))

  // Build IMAGE_FOLDERS object with filenames
  const foldersEntries = results
    .map((r) => {
      const filenames = r.images.map((img) => `'${img.name}'`).join(', ')
      return `  ${r.name}: [${filenames}]`
    })
    .join(',\n')

  // Build type exports for each folder
  const typeExports = results
    .map((r) => {
      const typeName = `${toPascalCase(r.name)}Filename`
      return `export type ${typeName} = (typeof IMAGE_FOLDERS)['${r.name}'][number]`
    })
    .join('\n')

  // Export the widths array
  const widthsArray = IMAGE_WIDTHS.join(', ')

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated by: npm run images:generate
 * Source: ${SOURCE_DIR}/
 * Output: ${OUTPUT_DIR}/
 */

/** Available responsive image widths */
export const IMAGE_WIDTHS = [${widthsArray}] as const
export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

/** All image folders and their base filenames (without size suffix or extension) */
export const IMAGE_FOLDERS = {
${foldersEntries},
} as const

/** Available image folder names */
export type ImageFolder = keyof typeof IMAGE_FOLDERS

/** Filename types for each folder */
${typeExports}
`
}

main().catch(console.error)
