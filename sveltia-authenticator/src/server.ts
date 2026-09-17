import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { handleAuthFlow, handleCallbackFlow } from './auth-flow.js'
import type { Env } from './auth-flow.js'

const AUTH_PATHS: Array<string> = ['/auth', '/oauth/authorize']
const CALLBACK_PATHS: Array<string> = ['/callback', '/oauth/redirect']

export const handle = (request: Request, env: Env): Promise<Response> | Response => {
  const { pathname } = new URL(request.url)

  if (request.method === 'GET' && AUTH_PATHS.includes(pathname)) {
    return handleAuthFlow(request, env)
  }

  if (request.method === 'GET' && CALLBACK_PATHS.includes(pathname)) {
    return handleCallbackFlow(request, env)
  }

  return new Response(null, { status: 404 })
}

const toRequest = (incoming: IncomingMessage): Request | undefined => {
  const { host } = incoming.headers

  if (host === undefined) {
    return undefined
  }

  const headers = new Headers()

  for (const [key, value] of Object.entries(incoming.headers)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        headers.append(key, item)
      }
    }
  }

  return new Request(`http://${host}${incoming.url ?? '/'}`, {
    method: incoming.method,
    headers,
  })
}

const sendResponse = async (response: Response, outgoing: ServerResponse): Promise<void> => {
  outgoing.statusCode = response.status
  response.headers.forEach((value, key) => outgoing.setHeader(key, value))
  outgoing.end(await response.text())
}

export const createRequestHandler =
  (env: Env) =>
  (incoming: IncomingMessage, outgoing: ServerResponse): void => {
    const request = toRequest(incoming)

    if (request === undefined) {
      outgoing.statusCode = 400
      outgoing.end()
      return
    }

    void Promise.resolve(handle(request, env))
      .then((response) => sendResponse(response, outgoing))
      .catch(() => {
        if (outgoing.headersSent) {
          outgoing.end()
          return
        }

        outgoing.statusCode = 500
        outgoing.end()
      })
  }

export interface StartServerOptions {
  env: Env
  host?: string
  port?: number
}

export const startServer = async ({
  env,
  host = '0.0.0.0',
  port = 8080,
}: StartServerOptions): Promise<Server> => {
  const server = createServer(createRequestHandler(env))

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve)
  })

  return server
}
