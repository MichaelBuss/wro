import type { Env } from './auth-flow.js'

interface RenderPageOptions {
  env: Env
  provider?: string
  token?: string
  error?: string
  errorCode?: string
  status?: number
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getDomainPatterns = (allowedDomains: string | undefined): Array<string> =>
  (allowedDomains ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => `^${escapeRegExp(value).replaceAll('\\*', '.+')}$`)

const serialize = (value: unknown): string =>
  JSON.stringify(value ?? null).replaceAll('<', '\\u003c')

export const renderPage = ({
  env,
  provider = 'unknown',
  token,
  error,
  errorCode,
  status = 200,
}: RenderPageOptions): Response => {
  const state = error === undefined ? 'success' : 'error'
  const content =
    error === undefined ? { provider, token } : { provider, error, errorCode }

  const body = `
      <!doctype html><html><body><script>
        (() => {
          const trustedPatterns = ${serialize(getDomainPatterns(env.ALLOWED_DOMAINS))};
          const hasToken = ${serialize(token !== undefined)};

          const isTrusted = (origin) => {
            try {
              const { hostname } = new URL(origin);

              return trustedPatterns.some((pattern) => new RegExp(pattern).test(hostname));
            } catch {
              return false;
            }
          };

          window.addEventListener('message', ({ data, origin }) => {
            if (data !== 'authorizing:${provider}') {
              return;
            }

            if (hasToken && trustedPatterns.length && !isTrusted(origin)) {
              return;
            }

            window.opener?.postMessage(
              'authorization:${provider}:${state}:${serialize(content)}',
              origin
            );
          });
          window.opener?.postMessage('authorizing:${provider}', '*');
        })();
      </script></body></html>
    `

  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Set-Cookie': 'csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure',
    },
  })
}
