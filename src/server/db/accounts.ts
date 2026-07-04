import { and, eq } from 'drizzle-orm'
import type { Database } from './client'
import { passkey, session, user } from './schema'
import type { UserRole, UserRow } from './schema'

/**
 * Data-layer accessors for Accounts, their passkeys, and their sessions.
 *
 * These sit over the same tables Better Auth writes to, and give the rest of
 * the app (and the tests) a small, typed, injectable seam onto the auth data —
 * mirroring the `createContentAccessors(store)` pattern used for content.
 */

export interface NewAccount {
  email: string
  name: string
  role?: UserRole
}

export async function createAccount(db: Database, input: NewAccount) {
  const now = new Date()
  const rows = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      emailVerified: false,
      role: input.role ?? 'coach',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  // INSERT ... RETURNING always returns exactly one row for a single-row insert.
  if (!rows[0]) {
    throw new Error(`createAccount: INSERT returned no rows for ${input.email}`)
  }
  return rows[0]
}

export async function getAccountByEmail(
  db: Database,
  email: string,
): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
  return rows.length > 0 && rows[0] ? rows[0] : null
}

export async function getAccountById(
  db: Database,
  id: string,
): Promise<UserRow | null> {
  const rows = await db.select().from(user).where(eq(user.id, id)).limit(1)
  return rows.length > 0 && rows[0] ? rows[0] : null
}

export interface NewPasskey {
  userId: string
  credentialID: string
  publicKey: string
  deviceType?: string
  backedUp?: boolean
  name?: string
}

export async function linkPasskey(db: Database, input: NewPasskey) {
  const rows = await db
    .insert(passkey)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      credentialID: input.credentialID,
      publicKey: input.publicKey,
      counter: 0,
      deviceType: input.deviceType ?? 'singleDevice',
      backedUp: input.backedUp ?? false,
      name: input.name,
      createdAt: new Date(),
    })
    .returning()

  if (!rows[0]) {
    throw new Error('linkPasskey: INSERT returned no rows')
  }
  return rows[0]
}

export async function getPasskeysForAccount(db: Database, userId: string) {
  return db.select().from(passkey).where(eq(passkey.userId, userId))
}

export interface NewSession {
  userId: string
  token: string
  expiresAt: Date
}

export async function createSession(db: Database, input: NewSession) {
  const now = new Date()
  const rows = await db
    .insert(session)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      token: input.token,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!rows[0]) {
    throw new Error('createSession: INSERT returned no rows')
  }
  return rows[0]
}

/**
 * Resolve the Account behind a live session token, or `null` when the token is
 * unknown or expired. This is the data-layer shape of "who is signed in".
 */
export async function getAccountBySessionToken(db: Database, token: string) {
  const rows = await db
    .select({ account: user, expiresAt: session.expiresAt })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, token))
    .limit(1)

  if (rows.length === 0 || !rows[0]) {
    return null
  }

  const row = rows[0]

  if (row.expiresAt.getTime() <= Date.now()) {
    return null
  }

  return row.account
}

export async function deleteSession(db: Database, token: string) {
  await db.delete(session).where(eq(session.token, token))
}

export async function deleteSessionForUser(
  db: Database,
  userId: string,
  token: string,
) {
  await db
    .delete(session)
    .where(and(eq(session.userId, userId), eq(session.token, token)))
}
