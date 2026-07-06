import { getRequestHeaders } from '@tanstack/solid-start/server'
import { getAuth } from '~/server/auth'
import { getAccountById } from '~/server/db/accounts'
import { getDb } from '~/server/db/client'
import type { UserRow } from '~/server/db/schema'

/**
 * Server-side authentication guards for `createServerFn` handlers.
 *
 * The "who is this / are they an organizer" logic used to be copy-pasted, byte
 * for byte, into five private helpers across team-, account-, recovery-, and
 * organizer-functions. Sharing it means a change to what "authenticated" or
 * "organizer" means — an account-suspended check, a cached role lookup — lands
 * once instead of drifting across five untested copies.
 *
 * Route `beforeLoad` guards live in lib/auth-functions.ts (`getSession`,
 * `getSessionWithRole`); these are their in-handler counterparts and throw
 * rather than redirect.
 */

/**
 * Require an authenticated Account. Returns the Better Auth session user.
 * Throws `Unauthorized` when there is no session.
 */
export async function requireAccount() {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/**
 * Require an authenticated Account carrying the organizer role. Returns the
 * organizer's Account row. Throws `Unauthorized` when signed out and
 * `Forbidden: organizer role required` when the account is not an organizer.
 */
export async function requireOrganizer(): Promise<UserRow> {
  const sessionUser = await requireAccount()
  const db = await getDb()
  const account = await getAccountById(db, sessionUser.id)
  if (!account || account.role !== 'organizer') {
    throw new Error('Forbidden: organizer role required')
  }
  return account
}
