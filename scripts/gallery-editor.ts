/**
 * Gallery Metadata Editor — local site
 *
 * A tiny, dependency-free local web app for enriching gallery photos: the
 * photo on one side, its metadata form (alt, description, event, favorite,
 * focal point) on the other, saving straight back to content/gallery/*.md.
 * It's the "view the photo and edit the fields at the same time" companion
 * to `gallery:status`, without the VS Code back-and-forth or a round-trip
 * through GitHub.
 *
 * Purely local and dev-only — it reads and writes files on disk directly
 * (no auth, no network backend), so run it on your own machine against your
 * working copy, including just-added, not-yet-committed entries. It never
 * ships to production.
 *
 * Run with: npm run gallery:edit         (opens http://localhost:4321)
 *           npm run gallery:edit -- --port 5000 --no-open
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { GALLERY_EVENTS, OBJECT_POSITIONS } from '~/content/registry'
import {
  GALLERY_DIR,
  readGalleryReports,
  writeGalleryEntry,
} from './gallery-metadata'
import type { GalleryEntryReport } from './gallery-metadata'

const HTML_PATH = fileURLToPath(
  new URL('./gallery-editor.html', import.meta.url),
)

const editSchema = z.object({
  alt: z.string(),
  description: z.string(),
  event: z.enum(GALLERY_EVENTS).nullable(),
  location: z.string(),
  favorite: z.boolean(),
  position: z.enum(OBJECT_POSITIONS).nullable(),
})

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

/** The flat, JSON-friendly shape the client consumes — dates as ISO
 * strings, absent optionals as `null`, plus a ready-to-use image URL. */
function toClient(report: GalleryEntryReport) {
  return {
    slug: report.slug,
    image: report.image ?? null,
    imageUrl:
      report.image === undefined
        ? null
        : `/image/${encodeURIComponent(report.image)}`,
    imageExists: report.imageExists,
    alt: report.alt,
    description: report.description,
    event: report.event ?? null,
    location: report.location,
    position: report.position ?? null,
    favorite: report.favorite,
    date: report.date === undefined ? null : report.date.toISOString(),
    status: report.status,
    needsAlt: report.needsAlt,
    needsDescription: report.needsDescription,
    missingImage: report.missingImage,
  }
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function serveImage(res: ServerResponse, requested: string): void {
  // Defend against path traversal: only ever a bare filename inside
  // content/gallery/, never a nested or escaping path.
  const name = basename(requested)
  const filePath = join(GALLERY_DIR, name)

  if (name !== requested || !existsSync(filePath)) {
    sendJson(res, 404, { error: `No such image: ${requested}` })
    return
  }

  const contentType =
    IMAGE_CONTENT_TYPES[extname(name).toLowerCase()] ??
    'application/octet-stream'
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-cache',
  })
  res.end(readFileSync(filePath))
}

function savePhoto(res: ServerResponse, slug: string, rawBody: string): void {
  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    sendJson(res, 400, { error: 'Request body was not valid JSON' })
    return
  }

  const parsed = editSchema.safeParse(parsedBody)
  if (!parsed.success) {
    sendJson(res, 400, {
      error: 'Invalid fields',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (!existsSync(join(GALLERY_DIR, `${slug}.md`))) {
    sendJson(res, 404, { error: `No gallery entry "${slug}"` })
    return
  }

  const report = writeGalleryEntry(slug, parsed.data)
  sendJson(res, 200, toClient(report))
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const { pathname } = url

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(readFileSync(HTML_PATH, 'utf-8'))
    return
  }

  if (req.method === 'GET' && pathname === '/api/photos') {
    sendJson(res, 200, {
      events: GALLERY_EVENTS,
      positions: OBJECT_POSITIONS,
      photos: readGalleryReports().map(toClient),
    })
    return
  }

  if (req.method === 'GET' && pathname.startsWith('/image/')) {
    serveImage(res, decodeURIComponent(pathname.slice('/image/'.length)))
    return
  }

  const saveMatch = /^\/api\/photos\/([^/]+)$/.exec(pathname)
  if (req.method === 'POST' && saveMatch) {
    const slug = decodeURIComponent(saveMatch[1])
    savePhoto(res, slug, await readBody(req))
    return
  }

  sendJson(res, 404, { error: `Not found: ${req.method} ${pathname}` })
}

function parsePort(argv: Array<string>): number {
  const flagIndex = argv.indexOf('--port')
  const raw = flagIndex === -1 ? process.env.PORT : argv.at(flagIndex + 1)
  const parsed = z.coerce.number().int().positive().safeParse(raw)
  return parsed.success ? parsed.data : 4321
}

function openBrowser(targetUrl: string): void {
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'
  try {
    spawn(command, [targetUrl], { stdio: 'ignore', detached: true }).unref()
  } catch {
    // Opening a browser is a convenience, not a requirement — the URL is
    // printed below regardless.
  }
}

function main(): void {
  const argv = process.argv.slice(2)
  const port = parsePort(argv)
  const shouldOpen = !argv.includes('--no-open')

  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : 'Server error',
      })
    })
  })

  server.listen(port, () => {
    const targetUrl = `http://localhost:${port}`
    const count = readGalleryReports().length
    console.log('')
    console.log(`Gallery editor running at ${targetUrl}`)
    console.log(
      `Editing ${count} photo${count === 1 ? '' : 's'} in ${GALLERY_DIR}/`,
    )
    console.log('Saves write straight to disk. Press Ctrl+C to stop.')
    console.log('')
    if (shouldOpen) openBrowser(targetUrl)
  })

  server.on('error', (error: unknown) => {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'EADDRINUSE'
    ) {
      console.error(
        `Port ${port} is already in use. Pass a different one, e.g. npm run gallery:edit -- --port ${port + 1}`,
      )
    } else {
      console.error(error)
    }
    process.exitCode = 1
  })
}

main()
