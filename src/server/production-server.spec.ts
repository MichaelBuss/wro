import { once } from 'node:events'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import type { IncomingMessage, Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { adminRedirectLocation, createFetchRequest, parsePort, startProductionServer, staticPathCandidates } from './production-server.mjs'

type NodeRequest = Pick<IncomingMessage, 'headers' | 'method' | 'url'>

function fakeRequest(init: { method?: string; url?: string; headers?: Record<string, string | Array<string>>; body?: string }): NodeRequest {
  const req = Object.assign(new Readable({ read: () => undefined }), {
    method: init.method ?? 'GET',
    url: init.url ?? '/',
    headers: init.headers ?? {},
  })
  if (init.body !== undefined) req.push(init.body)
  req.push(null)
  return req
}

function serverPort(server: Server): number {
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('server has no TCP address')
  return address.port
}

/** A free-ish high port; the assertion verifies the server actually bound it. */
function randomPort(): string {
  return String(20_000 + Math.floor(Math.random() * 10_000))
}

async function withPort(port: string, run: () => Promise<void>): Promise<void> {
  const previous = process.env.PORT
  process.env.PORT = port
  try {
    await run()
  } finally {
    if (previous === undefined) delete process.env.PORT
    else process.env.PORT = previous
  }
}

async function createClientRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'wro-static-'))
  await mkdir(join(root, 'prerendered'), { recursive: true })
  await mkdir(join(root, 'cms'), { recursive: true })
  await writeFile(join(root, 'index.html'), '<html lang="da">forside</html>')
  await writeFile(join(root, 'prerendered', 'index.html'), '<html lang="da">prerenderet</html>')
  await writeFile(join(root, 'cms', 'index.html'), '<html lang="da">sveltia</html>')
  await writeFile(join(root, 'logo.webp'), 'fake-image-bytes')
  return root
}

async function closeServer(server: Server): Promise<void> {
  server.close()
  server.closeIdleConnections()
  await once(server, 'close')
}

describe('staticPathCandidates', () => {
  const root = '/srv/client'

  it('resolves the root pathname to the prerendered index', () => {
    expect(staticPathCandidates(root, '/')).toContain(join(root, 'index.html'))
  })

  it('orders the exact file before the directory-style prerendered form', () => {
    const candidates = staticPathCandidates(root, '/assets/index-abc.js')
    expect(candidates[0]).toBe(join(root, 'assets/index-abc.js'))
    expect(candidates[1]).toBe(join(root, 'assets/index-abc.js/index.html'))
  })

  it('resolves the CMS SPA entry without a trailing slash', () => {
    expect(staticPathCandidates(root, '/cms')).toContain(join(root, 'cms/index.html'))
  })

  it('contains dot-segment traversal attempts inside the client root', () => {
    for (const pathname of ['/../secret.txt', '/../../etc/passwd', '/%2e%2e/%2e%2e/secret.txt', '/blog/../../secret.txt']) {
      for (const candidate of staticPathCandidates(root, pathname)) {
        expect(candidate === root || candidate.startsWith(`${root}/`)).toBe(true)
        expect(candidate.includes('..')).toBe(false)
      }
    }
  })

  it('rejects malformed encodings and null bytes', () => {
    expect(staticPathCandidates(root, '/%zz')).toEqual([])
    expect(staticPathCandidates(root, '/\0')).toEqual([])
  })
})

describe('adminRedirectLocation', () => {
  it('maps /admin to /cms', () => {
    expect(adminRedirectLocation('/admin')).toBe('/cms')
  })

  it('maps sub-paths to their /cms equivalents', () => {
    expect(adminRedirectLocation('/admin/')).toBe('/cms/')
    expect(adminRedirectLocation('/admin/config.yml')).toBe('/cms/config.yml')
    expect(adminRedirectLocation('/admin/deep/nested/path')).toBe('/cms/deep/nested/path')
  })

  it('keeps percent-encodings intact', () => {
    expect(adminRedirectLocation('/admin/gallery/a%20b.webp')).toBe('/cms/gallery/a%20b.webp')
  })

  it('ignores paths that merely start with /admin', () => {
    expect(adminRedirectLocation('/administrator')).toBeUndefined()
    expect(adminRedirectLocation('/adminxxx/config.yml')).toBeUndefined()
  })

  it('ignores everything else', () => {
    expect(adminRedirectLocation('/')).toBeUndefined()
    expect(adminRedirectLocation('/cms')).toBeUndefined()
  })
})

describe('parsePort', () => {
  it('accepts a numeric port string', () => {
    expect(parsePort('8080')).toBe(8080)
  })

  it('accepts undefined and blank input', () => {
    expect(parsePort(undefined)).toBeUndefined()
    expect(parsePort('')).toBeUndefined()
    expect(parsePort('   ')).toBeUndefined()
  })

  it('rejects non-integers and out-of-range values', () => {
    expect(parsePort('http')).toBeUndefined()
    expect(parsePort('80.5')).toBeUndefined()
    expect(parsePort('0')).toBeUndefined()
    expect(parsePort('70000')).toBeUndefined()
  })
})

describe('createFetchRequest', () => {
  it('builds the URL from the Host header', () => {
    const request = createFetchRequest(fakeRequest({ url: '/blog?side=2', headers: { host: 'wro-denmark.dk' } }), 3000)
    expect(request.url).toBe('http://wro-denmark.dk/blog?side=2')
  })

  it('prefers the proxy protocol from x-forwarded-proto', () => {
    const request = createFetchRequest(fakeRequest({ headers: { host: 'wro-denmark.dk', 'x-forwarded-proto': 'https, http' } }), 3000)
    expect(request.url).toBe('https://wro-denmark.dk/')
  })

  it('falls back to localhost with the server port', () => {
    const request = createFetchRequest(fakeRequest({ headers: {} }), 4173)
    expect(request.url).toBe('http://localhost:4173/')
  })

  it('drops hop-by-hop headers and keeps the rest', () => {
    const request = createFetchRequest(
      fakeRequest({ headers: { host: 'wro-denmark.dk', connection: 'keep-alive', 'transfer-encoding': 'chunked', 'content-type': 'application/json' } }),
      3000,
    )
    expect(request.headers.get('connection')).toBeNull()
    expect(request.headers.get('transfer-encoding')).toBeNull()
    expect(request.headers.get('content-type')).toBe('application/json')
  })

  it('streams a POST body through', async () => {
    const request = createFetchRequest(fakeRequest({ method: 'POST', headers: { host: 'localhost' }, body: '{"hello":"world"}' }), 3000)
    expect(request.method).toBe('POST')
    expect(await request.text()).toBe('{"hello":"world"}')
  })
})

describe('startProductionServer', () => {
  it('serves matching files and forwards everything else to the fetch handler', async () => {
    const servedUrls: Array<string> = []
    const handler = {
      fetch: (request: Request) => {
        servedUrls.push(request.url)
        return new Response('dynamic', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
      },
    }

    await withPort(randomPort(), async () => {
      const server = await startProductionServer({ clientRoot: await createClientRoot(), handler, log: { info: () => undefined } })
      try {
        const port = serverPort(server)

        const prerendered = await fetch(`http://localhost:${port}/prerendered`)
        expect(prerendered.status).toBe(200)
        expect(await prerendered.text()).toContain('prerenderet')

        const asset = await fetch(`http://localhost:${port}/logo.webp`)
        expect(asset.status).toBe(200)
        expect(asset.headers.get('content-type')).toBe('image/webp')

        const forwarded = await fetch(`http://localhost:${port}/login`)
        expect(forwarded.status).toBe(404)
        expect(await forwarded.text()).toBe('dynamic')
        expect(servedUrls).toHaveLength(1)
      } finally {
        await closeServer(server)
      }
    })
  })

  it('serves the CMS SPA at /cms and 301-redirects legacy /admin paths', async () => {
    await withPort(randomPort(), async () => {
      const server = await startProductionServer({
        clientRoot: await createClientRoot(),
        handler: { fetch: () => new Response('dynamic', { status: 404 }) },
        log: { info: () => undefined },
      })
      try {
        const port = serverPort(server)

        const cms = await fetch(`http://localhost:${port}/cms`)
        expect(cms.status).toBe(200)
        expect(await cms.text()).toContain('sveltia')

        const admin = await fetch(`http://localhost:${port}/admin`, { redirect: 'manual' })
        expect(admin.status).toBe(301)
        expect(admin.headers.get('location')).toBe('/cms')

        const adminSubPath = await fetch(`http://localhost:${port}/admin/config.yml`, { redirect: 'manual' })
        expect(adminSubPath.status).toBe(301)
        expect(adminSubPath.headers.get('location')).toBe('/cms/config.yml')

        const adminQuery = await fetch(`http://localhost:${port}/admin?path=sidebar`, { redirect: 'manual' })
        expect(adminQuery.status).toBe(301)
        expect(adminQuery.headers.get('location')).toBe('/cms?path=sidebar')
      } finally {
        await closeServer(server)
      }
    })
  })

  it('binds the port from the PORT environment variable', async () => {
    const port = randomPort()
    await withPort(port, async () => {
      const server = await startProductionServer({
        clientRoot: await createClientRoot(),
        handler: { fetch: () => new Response('') },
        log: { info: () => undefined },
      })
      try {
        expect(serverPort(server)).toBe(Number(port))
      } finally {
        await closeServer(server)
      }
    })
  })
})
