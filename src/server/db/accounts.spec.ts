import { describe, expect, it } from 'vitest'
import {
  createAccount,
  createSession,
  deleteSession,
  getAccountByEmail,
  getAccountBySessionToken,
  getPasskeysForAccount,
  linkPasskey,
} from './accounts'
import { account, passkey, session, user, verification } from './schema'
import { createTestDb } from './testing'

const HOUR = 60 * 60 * 1000

describe('auth data layer', () => {
  it('applies all migrations cleanly to an empty database', async () => {
    // Arrange / Act
    const db = await createTestDb()

    // Assert — a missing table would make these selects throw.
    await expect(db.select().from(user)).resolves.toEqual([])
    await expect(db.select().from(session)).resolves.toEqual([])
    await expect(db.select().from(account)).resolves.toEqual([])
    await expect(db.select().from(verification)).resolves.toEqual([])
    await expect(db.select().from(passkey)).resolves.toEqual([])
  })

  it('persists a created Account and retrieves it by email', async () => {
    // Arrange
    const db = await createTestDb()

    // Act
    const created = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const found = await getAccountByEmail(db, 'coach@example.com')

    // Assert
    expect(created.id).toBeTruthy()
    expect(found).toMatchObject({
      id: created.id,
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
  })

  it('returns null for an unknown email', async () => {
    // Arrange
    const db = await createTestDb()

    // Act
    const found = await getAccountByEmail(db, 'nobody@example.com')

    // Assert
    expect(found).toBeNull()
  })

  it('stores a passkey credential against an Account and retrieves it', async () => {
    // Arrange
    const db = await createTestDb()
    const acc = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    // Act
    await linkPasskey(db, {
      userId: acc.id,
      credentialID: 'cred-123',
      publicKey: 'pub-key-abc',
      name: 'MacBook',
    })
    const passkeys = await getPasskeysForAccount(db, acc.id)

    // Assert
    expect(passkeys).toHaveLength(1)
    expect(passkeys[0]).toMatchObject({
      userId: acc.id,
      credentialID: 'cred-123',
      publicKey: 'pub-key-abc',
    })
  })

  it('resolves the signed-in Account from a live session token', async () => {
    // Arrange
    const db = await createTestDb()
    const acc = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    await createSession(db, {
      userId: acc.id,
      token: 'session-token-1',
      expiresAt: new Date(Date.now() + HOUR),
    })

    // Act
    const resolved = await getAccountBySessionToken(db, 'session-token-1')

    // Assert
    expect(resolved).toMatchObject({ id: acc.id, email: 'coach@example.com' })
  })

  it('reports signed-out once the session is torn down', async () => {
    // Arrange
    const db = await createTestDb()
    const acc = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    await createSession(db, {
      userId: acc.id,
      token: 'session-token-1',
      expiresAt: new Date(Date.now() + HOUR),
    })

    // Act
    await deleteSession(db, 'session-token-1')
    const resolved = await getAccountBySessionToken(db, 'session-token-1')

    // Assert
    expect(resolved).toBeNull()
  })

  it('treats an expired session as signed out', async () => {
    // Arrange
    const db = await createTestDb()
    const acc = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    await createSession(db, {
      userId: acc.id,
      token: 'expired-token',
      expiresAt: new Date(Date.now() - HOUR),
    })

    // Act
    const resolved = await getAccountBySessionToken(db, 'expired-token')

    // Assert
    expect(resolved).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Issue 005 — Organizer role assignment
  // ---------------------------------------------------------------------------

  describe('organizer role assignment', () => {
    it('defaults a new Account to the coach role', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      const acc = await createAccount(db, {
        email: 'coach@example.com',
        name: 'Coach Nova',
      })

      // Assert
      expect(acc.role).toBe('coach')
    })

    it('creates an Account with the organizer role when explicitly passed', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      const acc = await createAccount(db, {
        email: 'admin@wro.dk',
        name: 'Organizer',
        role: 'organizer',
      })

      // Assert
      expect(acc.role).toBe('organizer')
    })

    it('non-allowlisted email receives coach role', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      const acc = await createAccount(db, {
        email: 'random@example.com',
        name: 'Random Person',
      })

      // Assert — default role is coach
      expect(acc.role).toBe('coach')
    })
  })
})
