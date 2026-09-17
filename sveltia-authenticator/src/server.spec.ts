import { createServer } from 'node:http'
import type { IncomingMessage, Server } from 'node:http'
import { describe, expect, it } from 'vitest'
import { handleAuthFlow, handleCallbackFlow } from './auth-flow.js'
import type { Env } from './auth-flow.js'
import { startServer } from './server.js'

const CLIENT_ID = 'test-client-id'
const CLIENT_SECRET = 'test-client-secret'
const CSRF_TOKEN = 'a'.repeat(32)
const CSRF_COOKIE = `csrf-token=github_${CSRF_TOKEN}`

const baseEnv = (overrides: Env = {}): Env => ({
  GITHUB_CLIENT_ID: CLIENT_ID,
  GITHUB_CLIENT_SECRET: CLIENT_SECRET,
  ...overrides,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getPort = (server: Server): number => {
  const address = server.address()

  if (address === null || typeof address === 'string') {
    throw new Error('Server has no address')
  }

  return address.port
}

interface StubGitHub {
  bodies: Array<Record<string, unknown>>
  close: () => Promise<void>
  port: number
}

const startStubGitHub = (status: number, payload: unknown): Promise<StubGitHub> => {
  const bodies: Array<Record<string, unknown>> = []

  return new Promise((resolve) => {
    const server: Server = createServer((incoming: IncomingMessage, outgoing) => {
      const chunks: Array<Buffer> = []

      incoming.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      incoming.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')

        if (raw !== '' && isRecord(JSON.parse(raw))) {
          bodies.push(JSON.parse(raw))
        }

        outgoing.statusCode = status
        outgoing.setHeader('Content-Type', 'application/json')
        outgoing.end(JSON.stringify(payload))
      })
    })

    void server.listen(0, '127.0.0.1', () => {
      resolve({
        bodies,
        close: () =>
          new Promise<void>((resolveClose) => {
            server.close(() => resolveClose())
          }),
        port: getPort(server),
      })
    })
  })
}

describe('auth flow', () => {
  it('redirects GitHub sign-ins to the OAuth authorize URL and sets the CSRF cookie', () => {
    const request = new Request(
      'http://auth.example.test/auth?provider=github&site_id=beta.wro-denmark.dk',
    )

    const response = handleAuthFlow(
      request,
      baseEnv({ ALLOWED_DOMAINS: 'wro-denmark.dk,*.wro-denmark.dk' }),
    )

    expect(response.status).toBe(302)

    const location = response.headers.get('location')

    expect(location).not.toBeNull()

    if (location === null) {
      return
    }

    const authorizeURL = new URL(location)

    expect(authorizeURL.origin).toBe('https://github.com')
    expect(authorizeURL.pathname).toBe('/login/oauth/authorize')
    expect(authorizeURL.searchParams.get('client_id')).toBe(CLIENT_ID)
    expect(authorizeURL.searchParams.get('scope')).toBe('repo,user')
    expect(authorizeURL.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/)
    expect(response.headers.getSetCookie()[0]).toMatch(/^csrf-token=github_[0-9a-f]{32}/)
  })

  it('rejects unsupported backends with a clean 400 page', async () => {
    const request = new Request('http://auth.example.test/auth?provider=gitlab')
    const response = handleAuthFlow(request, baseEnv())

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('UNSUPPORTED_BACKEND')
  })

  it('rejects domains outside the allowlist with a clean 400 page', async () => {
    const request = new Request(
      'http://auth.example.test/auth?provider=github&site_id=evil.example.com',
    )
    const response = handleAuthFlow(request, baseEnv({ ALLOWED_DOMAINS: 'wro-denmark.dk' }))

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('UNSUPPORTED_DOMAIN')
  })

  it('rejects the exchange cleanly with 400 when OAuth credentials are not configured', async () => {
    const request = new Request('http://auth.example.test/auth?provider=github')
    const response = handleAuthFlow(request, {
      GITHUB_CLIENT_ID: undefined,
      GITHUB_CLIENT_SECRET: undefined,
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('MISCONFIGURED_CLIENT')
  })

  it('rejects a callback without an authorization code with a clean 400 page', async () => {
    const request = new Request('http://auth.example.test/callback', {
      headers: { cookie: CSRF_COOKIE },
    })
    const response = await handleCallbackFlow(request, baseEnv())

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('AUTH_CODE_REQUEST_FAILED')
  })

  it('rejects a callback whose state fails the CSRF check with a clean 400 page', async () => {
    const request = new Request('http://auth.example.test/callback?code=abc&state=tampered', {
      headers: { cookie: CSRF_COOKIE },
    })
    const response = await handleCallbackFlow(request, baseEnv())

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('CSRF_DETECTED')
  })

  it('rejects a callback GitHub refuses with a clean 401 page and keeps serving', async () => {
    const github = await startStubGitHub(200, { error: 'bad_verification_code' })

    try {
      const env = baseEnv({ GITHUB_ORIGIN: `http://127.0.0.1:${github.port}` })
      const request = new Request(
        `http://auth.example.test/callback?code=bad-code&state=${CSRF_TOKEN}`,
        { headers: { cookie: CSRF_COOKIE } },
      )

      const response = await handleCallbackFlow(request, env)

      expect(response.status).toBe(401)
      expect(await response.text()).toContain('bad_verification_code')
      expect(github.bodies).toEqual([
        { code: 'bad-code', client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
      ])

      const followUp = handleAuthFlow(
        new Request('http://auth.example.test/auth?provider=github'),
        env,
      )

      expect(followUp.status).toBe(302)
    } finally {
      await github.close()
    }
  })

  it('returns a success page carrying the token when GitHub accepts the exchange', async () => {
    const github = await startStubGitHub(200, { access_token: 'token-123' })

    try {
      const request = new Request(
        `http://auth.example.test/callback?code=good-code&state=${CSRF_TOKEN}`,
        { headers: { cookie: CSRF_COOKIE } },
      )
      const response = await handleCallbackFlow(
        request,
        baseEnv({ GITHUB_ORIGIN: `http://127.0.0.1:${github.port}` }),
      )
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(body).toContain('authorization:github:success')
      expect(body).toContain('token-123')
    } finally {
      await github.close()
    }
  })
})

describe('http server', () => {
  it('serves the flows over real HTTP and answers unknown requests with a clean 404', async () => {
    const github = await startStubGitHub(200, { error: 'bad_verification_code' })
    const server = await startServer({
      env: baseEnv({ GITHUB_ORIGIN: `http://127.0.0.1:${github.port}` }),
      host: '127.0.0.1',
      port: 0,
    })

    try {
      const base = `http://127.0.0.1:${getPort(server)}`

      const notFound = await fetch(`${base}/nope`)

      expect(notFound.status).toBe(404)

      const missingCookie = await fetch(`${base}/callback?code=abc&state=${CSRF_TOKEN}`)

      expect(missingCookie.status).toBe(400)
      expect(await missingCookie.text()).toContain('UNSUPPORTED_BACKEND')

      const redirect = await fetch(`${base}/auth?provider=github&site_id=beta.wro-denmark.dk`, {
        redirect: 'manual',
      })

      expect(redirect.status).toBe(302)
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
      await github.close()
    }
  })
})
