/**
 * Self-contained production server for the built TanStack Start app.
 *
 * `vite build` emits the client (static assets + prerendered HTML) into
 * `dist/client` and a fetch-style SSR handler (default export `{ fetch }`)
 * into `dist/server/server.js`. This file wires the two together on a single
 * `node:http` process — no platform adapter involved:
 *
 *   1. GET/HEAD requests whose path matches a file in `dist/client`
 *      (including prerendered `<path>/index.html`) are served statically.
 *   2. Everything else — dynamic routes, server functions (`/_serverFn/*`),
 *      the passkey auth handler (`/api/auth/*`) — is forwarded to the SSR
 *      handler as a standard `Request`, and its `Response` is written back.
 *
 * Configuration is environment-only, so one process is the whole deploy:
 *   DATABASE_URL — Postgres connection string (read by the app at query time)
 *   PORT         — listen port (default 3000)
 *   HOST         — listen address (default 0.0.0.0)
 *
 * Run with: node src/server/production-server.mjs
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createGzip } from 'node:zlib'

const DEFAULT_PORT = 3000
const DEFAULT_HOST = '0.0.0.0'

/** Byte threshold below which compression costs more than it saves. */
const GZIP_MIN_BYTES = 1024

/** Hop-by-hop headers that must not cross the Node-to-fetch boundary. */
const HOP_BY_HOP_HEADERS = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'trailer', 'te'])

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.yml': 'application/yaml',
  '.yaml': 'application/yaml',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
}

const COMPRESSIBLE_PREFIXES = ['text/', 'application/javascript', 'application/json', 'application/xml', 'image/svg+xml']

/**
 * Ordered filesystem candidates for a request pathname inside `clientRoot`:
 * the exact file, its directory-style prerendered form (`/blog` →
 * `blog/index.html`) and its flat form (`/blog.html`). Empty when the path
 * escapes `clientRoot` — traversal never resolves.
 */
export function staticPathCandidates(clientRoot, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return []
  }
  if (decoded.includes('\0')) return []

  const base = resolve(clientRoot, `.${normalize(decoded)}`)
  if (base !== clientRoot && !base.startsWith(clientRoot + sep)) return []

  return [base, join(base, 'index.html'), `${base}.html`]
}

/** First candidate that exists on disk as a regular file: `{ path, stats }`. */
async function findStaticFile(clientRoot, pathname) {
  for (const candidate of staticPathCandidates(clientRoot, pathname)) {
    try {
      const stats = await stat(candidate)
      if (stats.isFile()) return { path: candidate, stats }
    } catch {
      // fall through to the next candidate
    }
  }
  return undefined
}

function isCompressible(contentType) {
  return COMPRESSIBLE_PREFIXES.some((prefix) => contentType.startsWith(prefix))
}

function acceptsGzip(acceptEncoding) {
  return typeof acceptEncoding === 'string' && acceptEncoding.split(',').some((part) => part.trim().split(';')[0] === 'gzip')
}

function etagFor(stats) {
  return `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(36)}"`
}

/**
 * Serve a GET/HEAD request from the client directory. Returns true when a
 * file matched (or revalidation returned 304); false when the SSR handler
 * should take over.
 */
async function serveStatic(clientRoot, req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const file = await findStaticFile(clientRoot, url.pathname)
  if (!file) return false

  const contentType = MIME_TYPES[extname(file.path).toLowerCase()] ?? 'application/octet-stream'
  const etag = etagFor(file.stats)
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, Vary: 'Accept-Encoding' })
    res.end()
    return true
  }

  const headers = {
    'Content-Type': contentType,
    ETag: etag,
    Vary: 'Accept-Encoding',
    // Vite emits content-hashed names under /assets/; those never change.
    'Cache-Control': url.pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  }

  const compress =
    req.method !== 'HEAD' &&
    file.stats.size >= GZIP_MIN_BYTES &&
    isCompressible(contentType) &&
    acceptsGzip(req.headers['accept-encoding'])

  if (compress) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' })
    await pipeline(createReadStream(file.path), createGzip(), res)
  } else {
    res.writeHead(200, headers)
    if (req.method === 'HEAD') {
      res.end()
    } else {
      await pipeline(createReadStream(file.path), res)
    }
  }
  return true
}

/**
 * Translate a Node `IncomingMessage` into the standard `Request` the SSR
 * handler understands. The protocol comes from `x-forwarded-proto` so the
 * app sees its real origin behind the reverse proxy.
 */
export function createFetchRequest(req, defaultPort) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const proto = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : ''
  const protocol = proto === 'https' ? 'https' : 'http'
  const host = typeof req.headers.host === 'string' && req.headers.host.length > 0 ? req.headers.host : `localhost:${defaultPort}`

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name)) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else {
      headers.set(name, String(value))
    }
  }

  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  return new Request(new URL(req.url ?? '/', `${protocol}://${host}`), {
    method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  })
}

/** Write a standard fetch `Response` back onto the Node server response. */
async function sendFetchResponse(fetchResponse, req, res) {
  for (const [name, value] of fetchResponse.headers) {
    if (name !== 'set-cookie') res.setHeader(name, value)
  }
  // getSetCookie() keeps multi-valued Set-Cookie headers intact; iterating the
  // Headers instance above would have joined them into one comma-soup value.
  const cookies = fetchResponse.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)
  res.statusCode = fetchResponse.status

  if (req.method === 'HEAD' || !fetchResponse.body) {
    res.end()
    if (fetchResponse.body) await fetchResponse.body.cancel().catch(() => undefined)
    return
  }
  await pipeline(Readable.fromWeb(fetchResponse.body), res)
}

/** Convert an unexpected failure into a plain 500 (or tear down the socket). */
function respondWithInternalServerError(res, error) {
  console.error('[production-server] request failed:', error)
  if (res.headersSent || res.writableEnded) {
    res.destroy()
    return
  }
  res.statusCode = 500
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Internal Server Error')
}

/**
 * Boot the production server. `handler` is the built SSR entry's default
 * export (`{ fetch }`). Resolves with the `node:http` server once it is
 * listening, so callers (and tests) can close it.
 */
export function startProductionServer({ clientRoot = CLIENT_ROOT, handler, log = console } = {}) {
  const port = parsePort(process.env.PORT) ?? DEFAULT_PORT
  const host = process.env.HOST || DEFAULT_HOST

  const server = createServer(async (req, res) => {
    try {
      if ((req.method === 'GET' || req.method === 'HEAD') && (await serveStatic(clientRoot, req, res))) return
      const fetchResponse = await handler.fetch(createFetchRequest(req, port))
      await sendFetchResponse(fetchResponse, req, res)
    } catch (error) {
      respondWithInternalServerError(res, error)
    }
  })

  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })

  const shutdown = () => {
    server.close()
    server.closeIdleConnections()
    // Force a container-friendly exit if in-flight requests refuse to drain.
    setTimeout(() => process.exit(0), 10_000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return new Promise((resolveListening) => {
    server.listen(port, host, () => {
      log.info(`[production-server] listening on http://${host}:${port}`)
      resolveListening(server)
    })
  })
}

/** Parse `PORT`; undefined when unset, malformed, or out of range. */
export function parsePort(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) return undefined
  return parsed
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const CLIENT_ROOT = resolve(MODULE_DIR, '../../dist/client')
const SERVER_ENTRY_PATH = resolve(MODULE_DIR, '../../dist/server/server.js')

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMainModule) {
  const handlerModule = await import(pathToFileURL(SERVER_ENTRY_PATH).href)
  const handler = handlerModule.default
  if (typeof handler?.fetch !== 'function') {
    console.error(`[production-server] ${SERVER_ENTRY_PATH} has no fetch-style default export — run \`npm run build\` first.`)
    process.exit(1)
  }
  await startProductionServer({ handler })
}
