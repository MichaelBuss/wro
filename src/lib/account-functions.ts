import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { getAuth } from '~/server/auth'
import { deleteAccount, exportAccountData } from '~/server/db/accounts'
import { getDb } from '~/server/db/client'

async function getAuthedUser() {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

/**
 * Return the full GDPR data export for the authenticated Account — their
 * profile, all their Teams, and all Participants in those Teams.
 */
export const exportMyDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthedUser()
    const db = await getDb()
    return exportAccountData(db, user.id)
  },
)

/**
 * Permanently erase the authenticated Account plus all their Teams and
 * Participants. Irreversible. The caller must sign the user out on the client
 * after this returns.
 */
export const deleteMyAccountFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getAuthedUser()
    const db = await getDb()
    await deleteAccount(db, user.id)
  },
)
