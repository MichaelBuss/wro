import { createFileRoute } from '@tanstack/solid-router'
import { getAuth } from '~/server/auth'

/**
 * Mount point for the Better Auth handler. All passkey ceremonies and session
 * endpoints live under `/api/auth/*`. This is a dynamic server route and is
 * excluded from the prerender crawl (see vite.config.ts).
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getAuth()
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        const auth = await getAuth()
        return auth.handler(request)
      },
    },
  },
})
