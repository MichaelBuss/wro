import { createServerFn } from '@tanstack/solid-start'
import { z } from 'zod'
import { requireAccount, requireOrganizer } from '~/server/auth-guards'
import {
  createRecoveryLink,
  deletePasskey,
  getAccountById,
  getPasskeysForAccount,
  getRecoveryLinkByToken,
} from '~/server/db/accounts'
import { getDb } from '~/server/db/client'
import { user } from '~/server/db/schema'
import type { UserRole } from '~/server/db/schema'

// ---------------------------------------------------------------------------
// Self-service passkey management (any signed-in Account)
// ---------------------------------------------------------------------------

/**
 * List the passkeys enrolled on the current Account. Used to render the
 * "My passkeys" section on the dashboard.
 */
export const listMyPasskeysFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const sessionUser = await requireAccount()
    const db = await getDb()
    const keys = await getPasskeysForAccount(db, sessionUser.id)
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.createdAt,
    }))
  },
)

const removePasskeySchema = z.object({ passkeyId: z.string().min(1) })

/**
 * Remove a passkey from the current Account. The ownership check is enforced
 * server-side: a coach cannot remove another coach's passkey.
 */
export const removePasskeyFn = createServerFn({ method: 'POST' })
  .validator(removePasskeySchema)
  .handler(async ({ data }) => {
    const sessionUser = await requireAccount()
    const db = await getDb()
    await deletePasskey(db, data.passkeyId, sessionUser.id)
  })

// ---------------------------------------------------------------------------
// Organizer: recovery link generation
// ---------------------------------------------------------------------------

/** Typed row returned to the organizer for the coach list. */
export interface CoachForRecovery {
  id: string
  name: string
  email: string
  role: UserRole
}

/**
 * Return all Accounts so the organizer can pick one to generate a recovery
 * link for.
 */
export const listAccountsForRecoveryFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireOrganizer()
  const db = await getDb()
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .orderBy(user.name)
  return rows
})

const generateRecoveryLinkSchema = z.object({
  targetUserId: z.string().min(1),
})

/** Expiry window for recovery links: 24 hours. */
const RECOVERY_LINK_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Generate a single-use, 24-hour recovery link for a coach. Only callable by
 * an organizer. The link row is also the generation audit-log entry.
 * Returns the full URL so the organizer can copy-paste it to the coach.
 */
export const generateRecoveryLinkFn = createServerFn({ method: 'POST' })
  .validator(generateRecoveryLinkSchema)
  .handler(async ({ data }) => {
    const organizer = await requireOrganizer()
    const db = await getDb()

    const target = await getAccountById(db, data.targetUserId)
    if (!target) throw new Error('Target account not found')

    const expiresAt = new Date(Date.now() + RECOVERY_LINK_TTL_MS)
    const link = await createRecoveryLink(db, {
      targetUserId: data.targetUserId,
      generatedByUserId: organizer.id,
      expiresAt,
    })

    return {
      token: link.token,
      expiresAt: link.expiresAt,
      targetName: target.name,
      targetEmail: target.email,
    }
  })

// ---------------------------------------------------------------------------
// Recovery page: validate token before showing the enroll UI
// ---------------------------------------------------------------------------

const validateRecoveryTokenSchema = z.object({
  token: z.string().min(1),
})

/**
 * Check whether a recovery token is still valid (not used, not expired).
 * Called by the /recover page on load so it can show either the enroll UI
 * or a clear error. Does NOT consume the token — consumption happens inside
 * Better Auth's resolveUser when the passkey ceremony completes.
 */
export const validateRecoveryTokenFn = createServerFn({ method: 'GET' })
  .validator(validateRecoveryTokenSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const link = await getRecoveryLinkByToken(db, data.token)

    if (!link) return { valid: false, reason: 'not_found' } as const
    if (link.usedAt) return { valid: false, reason: 'already_used' } as const
    if (link.expiresAt.getTime() <= Date.now()) {
      return { valid: false, reason: 'expired' } as const
    }

    const target = await getAccountById(db, link.targetUserId)
    if (!target) return { valid: false, reason: 'not_found' } as const

    return {
      valid: true,
      targetName: target.name,
      targetEmail: target.email,
    } as const
  })
