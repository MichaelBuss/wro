import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { getAuth } from '~/server/auth'
import { getAccountById } from '~/server/db/accounts'
import { getDb } from '~/server/db/client'

export {
  decideDashboardAccess,
  type AuthUser,
  type DashboardAccess,
} from './dashboard-access'

export {
  decideOrganizerAccess,
  type OrganizerAccess,
  type OrganizerUser,
} from './organizer-access'

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

/**
 * Read the current session and enrich it with the user's role from our DB.
 * Used by organizer-gated routes so role enforcement is server-side.
 * Returns `null` when signed out.
 */
export const getSessionWithRole = createServerFn({ method: 'GET' }).handler(
  async () => {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session?.user) return null
    const db = await getDb()
    const userRow = await getAccountById(db, session.user.id)
    if (!userRow) return null
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: userRow.role,
      },
    }
  },
)
