import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { getAuth } from '~/server/auth'

export {
  decideDashboardAccess,
  type AuthUser,
  type DashboardAccess,
} from './dashboard-access'

/**
 * Read the current session from the request cookies. Runs on the server; safe
 * to call from a route `beforeLoad`. Returns `null` when signed out.
 */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    return session
  },
)
