import { getDomainPatterns, renderPage } from './auth-page.js'

export type Env = Readonly<Record<string, string | undefined>>

const DEFAULT_GITHUB_ORIGIN = 'https://github.com'

const GITHUB_DEFAULT_SCOPE = 'repo,user'

const GITHUB_ALLOWED_SCOPES: Array<string> = [
  'repo',
  'public_repo',
  'user',
  'read:user',
  'user:email',
]

const CSRF_COOKIE_PATTERN = /\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/

const getScope = (requested: string | undefined): string => {
  const scopes = (requested ?? '')
    .split(/[\s,]+/)
    .filter((scope) => scope.length > 0)

  if (scopes.length === 0) {
    return GITHUB_DEFAULT_SCOPE
  }

  if (scopes.every((scope) => GITHUB_ALLOWED_SCOPES.includes(scope))) {
    return scopes.join(',')
  }

  console.warn(
    `Ignoring the unsupported "${requested}" scope for github; requesting "${GITHUB_DEFAULT_SCOPE}".`,
  )

  return GITHUB_DEFAULT_SCOPE
}

const githubOrigin = (env: Env): string => env.GITHUB_ORIGIN ?? DEFAULT_GITHUB_ORIGIN

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const parseTokenPayload = (
  payload: unknown,
): { token: string; error: string | undefined } => {
  if (!isRecord(payload)) {
    return { token: '', error: undefined }
  }

  return {
    token: typeof payload.access_token === 'string' ? payload.access_token : '',
    error: typeof payload.error === 'string' ? payload.error : undefined,
  }
}

export const handleAuthFlow = (request: Request, env: Env): Response => {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') ?? ''
  const domain = searchParams.get('site_id')
  const requestedScope = searchParams.get('scope') ?? undefined

  if (provider !== 'github') {
    return renderPage({
      env,
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
      status: 400,
    })
  }

  const domainPatterns = getDomainPatterns(env.ALLOWED_DOMAINS)

  if (
    domainPatterns.length > 0 &&
    !domainPatterns.some((pattern) => new RegExp(pattern).test(domain ?? ''))
  ) {
    return renderPage({
      env,
      provider,
      error: 'Your domain is not allowed to use the authenticator.',
      errorCode: 'UNSUPPORTED_DOMAIN',
      status: 400,
    })
  }

  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return renderPage({
      env,
      provider,
      error: 'OAuth app client ID or secret is not configured.',
      errorCode: 'MISCONFIGURED_CLIENT',
      status: 400,
    })
  }

  const csrfToken = globalThis.crypto.randomUUID().replaceAll('-', '')
  const authorizeURL = new URL('/login/oauth/authorize', githubOrigin(env))
  authorizeURL.search = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: getScope(requestedScope),
    state: csrfToken,
  }).toString()

  return new Response('', {
    status: 302,
    headers: {
      Location: authorizeURL.toString(),
      'Set-Cookie': `csrf-token=github_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  })
}

export const handleCallbackFlow = async (request: Request, env: Env): Promise<Response> => {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const match = request.headers.get('cookie')?.match(CSRF_COOKIE_PATTERN)
  const cookieProvider = match?.[1]
  const csrfToken = match?.[2]

  if (cookieProvider !== 'github') {
    return renderPage({
      env,
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
      status: 400,
    })
  }

  if (!code || !state) {
    return renderPage({
      env,
      provider: 'github',
      error: 'Failed to receive an authorization code. Please try again later.',
      errorCode: 'AUTH_CODE_REQUEST_FAILED',
      status: 400,
    })
  }

  if (!csrfToken || state !== csrfToken) {
    return renderPage({
      env,
      provider: 'github',
      error: 'Potential CSRF attack detected. Authentication flow aborted.',
      errorCode: 'CSRF_DETECTED',
      status: 400,
    })
  }

  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return renderPage({
      env,
      provider: 'github',
      error: 'OAuth app client ID or secret is not configured.',
      errorCode: 'MISCONFIGURED_CLIENT',
      status: 400,
    })
  }

  let response: Response

  try {
    response = await fetch(new URL('/login/oauth/access_token', githubOrigin(env)), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
      }),
    })
  } catch {
    return renderPage({
      env,
      provider: 'github',
      error: 'Failed to request an access token. Please try again later.',
      errorCode: 'TOKEN_REQUEST_FAILED',
      status: 502,
    })
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    return renderPage({
      env,
      provider: 'github',
      error: 'Server responded with malformed data. Please try again later.',
      errorCode: 'MALFORMED_RESPONSE',
      status: 502,
    })
  }

  if (!response.ok) {
    const { error } = parseTokenPayload(payload)

    return renderPage({
      env,
      provider: 'github',
      error: error ?? 'GitHub rejected the token exchange.',
      status: 401,
    })
  }

  const { token, error } = parseTokenPayload(payload)

  if (error !== undefined) {
    return renderPage({
      env,
      provider: 'github',
      error,
      status: 401,
    })
  }

  if (token === '') {
    return renderPage({
      env,
      provider: 'github',
      error: 'Server responded with malformed data. Please try again later.',
      errorCode: 'MALFORMED_RESPONSE',
      status: 502,
    })
  }

  return renderPage({
    env,
    provider: 'github',
    token,
    status: 200,
  })
}
