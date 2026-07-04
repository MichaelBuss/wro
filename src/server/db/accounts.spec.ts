import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  consumeRecoveryLink,
  createAccount,
  createRecoveryLink,
  deleteAccount,
  deletePasskey,
  exportAccountData,
  getPasskeysForAccount,
  getRecoveryLinkByToken,
  linkPasskey,
} from './accounts'
import { participant, passkey, team, teamMembership, user } from './schema'
import { addParticipant, createTeam } from './teams'
import { createTestDb } from './testing'

// ---------------------------------------------------------------------------
// GDPR: coach data export
// ---------------------------------------------------------------------------

describe('exportAccountData', () => {
  it('includes the Account profile in the export', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    // Act
    const result = await exportAccountData(db, coach.id)

    // Assert
    expect(result.account.id).toBe(coach.id)
    expect(result.account.name).toBe('Coach Nova')
    expect(result.account.email).toBe('coach@example.com')
    expect(result.account.role).toBe('coach')
  })

  it('includes all Teams and their Participants for the Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const t1 = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
    const t2 = await createTeam(db, { name: 'Team Beta', userId: coach.id })
    await addParticipant(db, t1.id, coach.id, {
      name: 'Alice',
      birthYear: 2010,
    })
    await addParticipant(db, t1.id, coach.id, { name: 'Bob', birthYear: 2011 })

    // Act
    const result = await exportAccountData(db, coach.id)

    // Assert
    const teamIds = result.teams.map((t) => t.id)
    expect(teamIds).toContain(t1.id)
    expect(teamIds).toContain(t2.id)

    const alpha = result.teams.find((t) => t.id === t1.id)
    expect(alpha?.participants).toHaveLength(2)
    const names = alpha?.participants.map((p) => p.name)
    expect(names).toContain('Alice')
    expect(names).toContain('Bob')

    const beta = result.teams.find((t) => t.id === t2.id)
    expect(beta?.participants).toHaveLength(0)
  })

  it('excludes Teams and Participants belonging to other Accounts', async () => {
    // Arrange
    const db = await createTestDb()
    const coachA = await createAccount(db, {
      email: 'coachA@example.com',
      name: 'Coach A',
    })
    const coachB = await createAccount(db, {
      email: 'coachB@example.com',
      name: 'Coach B',
    })
    await createTeam(db, { name: 'Team A', userId: coachA.id })
    const tB = await createTeam(db, { name: 'Team B', userId: coachB.id })
    await addParticipant(db, tB.id, coachB.id, {
      name: 'B-Participant',
      birthYear: 2012,
    })

    // Act — export coachA's data
    const result = await exportAccountData(db, coachA.id)

    // Assert — only Team A, no Team B or its participants
    expect(result.teams).toHaveLength(1)
    expect(result.teams[0]?.name).toBe('Team A')
    const allParticipantNames = result.teams.flatMap((t) =>
      t.participants.map((p) => p.name),
    )
    expect(allParticipantNames).not.toContain('B-Participant')
  })

  it('returns an empty teams list for an Account with no Teams', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    // Act
    const result = await exportAccountData(db, coach.id)

    // Assert
    expect(result.teams).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// GDPR: coach account erasure
// ---------------------------------------------------------------------------

describe('deleteAccount', () => {
  it('removes the Account row', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    // Act
    await deleteAccount(db, coach.id)

    // Assert
    const remaining = await db.select().from(user).where(eq(user.id, coach.id))
    expect(remaining).toHaveLength(0)
  })

  it('cascades deletion to all Teams owned by the Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const t1 = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
    const t2 = await createTeam(db, { name: 'Team Beta', userId: coach.id })

    // Act
    await deleteAccount(db, coach.id)

    // Assert — both teams gone
    const remainingTeams = await db
      .select()
      .from(team)
      .where(eq(team.id, t1.id))
    expect(remainingTeams).toHaveLength(0)

    const remainingTeams2 = await db
      .select()
      .from(team)
      .where(eq(team.id, t2.id))
    expect(remainingTeams2).toHaveLength(0)
  })

  it('cascades deletion to all Participants in those Teams — no orphaned rows remain', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const t = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
    await addParticipant(db, t.id, coach.id, { name: 'Alice', birthYear: 2010 })
    await addParticipant(db, t.id, coach.id, { name: 'Bob', birthYear: 2011 })

    // Act
    await deleteAccount(db, coach.id)

    // Assert — no participants remain for that team
    const remaining = await db
      .select()
      .from(participant)
      .where(eq(participant.teamId, t.id))
    expect(remaining).toHaveLength(0)
  })

  it('cascades deletion to TeamMembership rows — no orphaned memberships remain', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    await createTeam(db, { name: 'Team Alpha', userId: coach.id })

    // Act
    await deleteAccount(db, coach.id)

    // Assert — no memberships remain for this user
    const remaining = await db
      .select()
      .from(teamMembership)
      .where(eq(teamMembership.userId, coach.id))
    expect(remaining).toHaveLength(0)
  })

  it('does not affect Teams or Participants belonging to other Accounts', async () => {
    // Arrange
    const db = await createTestDb()
    const coachA = await createAccount(db, {
      email: 'coachA@example.com',
      name: 'Coach A',
    })
    const coachB = await createAccount(db, {
      email: 'coachB@example.com',
      name: 'Coach B',
    })
    const tB = await createTeam(db, { name: 'Team B', userId: coachB.id })
    await addParticipant(db, tB.id, coachB.id, {
      name: 'B-Participant',
      birthYear: 2012,
    })

    // Act — delete coachA
    await deleteAccount(db, coachA.id)

    // Assert — coachB's team and participant are unaffected
    const remainingTeams = await db
      .select()
      .from(team)
      .where(eq(team.id, tB.id))
    expect(remainingTeams).toHaveLength(1)

    const remainingParticipants = await db
      .select()
      .from(participant)
      .where(eq(participant.teamId, tB.id))
    expect(remainingParticipants).toHaveLength(1)
    expect(remainingParticipants[0]?.name).toBe('B-Participant')
  })
})

// ---------------------------------------------------------------------------
// Passkey management: list and remove
// ---------------------------------------------------------------------------

describe('getPasskeysForAccount / deletePasskey', () => {
  it('lists passkeys belonging to an Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    await linkPasskey(db, {
      userId: coach.id,
      credentialID: 'cred-1',
      publicKey: 'pk-1',
      name: 'Laptop',
    })
    await linkPasskey(db, {
      userId: coach.id,
      credentialID: 'cred-2',
      publicKey: 'pk-2',
      name: 'Phone',
    })

    // Act
    const keys = await getPasskeysForAccount(db, coach.id)

    // Assert
    expect(keys).toHaveLength(2)
    const names = keys.map((k) => k.name)
    expect(names).toContain('Laptop')
    expect(names).toContain('Phone')
  })

  it('does not list passkeys belonging to a different Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coachA = await createAccount(db, {
      email: 'coachA@example.com',
      name: 'Coach A',
    })
    const coachB = await createAccount(db, {
      email: 'coachB@example.com',
      name: 'Coach B',
    })
    await linkPasskey(db, {
      userId: coachB.id,
      credentialID: 'cred-b',
      publicKey: 'pk-b',
    })

    // Act
    const keys = await getPasskeysForAccount(db, coachA.id)

    // Assert
    expect(keys).toHaveLength(0)
  })

  it('removes a passkey owned by the Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const key = await linkPasskey(db, {
      userId: coach.id,
      credentialID: 'cred-1',
      publicKey: 'pk-1',
    })

    // Act
    await deletePasskey(db, key.id, coach.id)

    // Assert
    const remaining = await db
      .select()
      .from(passkey)
      .where(eq(passkey.id, key.id))
    expect(remaining).toHaveLength(0)
  })

  it('does not remove a passkey belonging to another Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coachA = await createAccount(db, {
      email: 'coachA@example.com',
      name: 'Coach A',
    })
    const coachB = await createAccount(db, {
      email: 'coachB@example.com',
      name: 'Coach B',
    })
    const keyB = await linkPasskey(db, {
      userId: coachB.id,
      credentialID: 'cred-b',
      publicKey: 'pk-b',
    })

    // Act — coachA tries to delete coachB's passkey
    await deletePasskey(db, keyB.id, coachA.id)

    // Assert — passkey is still there
    const remaining = await db
      .select()
      .from(passkey)
      .where(eq(passkey.id, keyB.id))
    expect(remaining).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Recovery links: generation, single-use, expiry, and audit log
// ---------------------------------------------------------------------------

function futureDate(offsetMs: number) {
  return new Date(Date.now() + offsetMs)
}

describe('createRecoveryLink / getRecoveryLinkByToken', () => {
  it('records the link with generation metadata (audit log)', async () => {
    // Arrange
    const db = await createTestDb()
    const organizer = await createAccount(db, {
      email: 'org@example.com',
      name: 'Organizer',
      role: 'organizer',
    })
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach',
    })
    const expiresAt = futureDate(24 * 60 * 60 * 1000)

    // Act
    const link = await createRecoveryLink(db, {
      targetUserId: coach.id,
      generatedByUserId: organizer.id,
      expiresAt,
    })

    // Assert — the row acts as the generation log entry
    expect(link.targetUserId).toBe(coach.id)
    expect(link.generatedByUserId).toBe(organizer.id)
    expect(link.usedAt).toBeNull()
    expect(link.createdAt).toBeInstanceOf(Date)
    expect(link.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -3)
  })

  it('retrieves a link by its token', async () => {
    // Arrange
    const db = await createTestDb()
    const organizer = await createAccount(db, {
      email: 'org@example.com',
      name: 'Organizer',
      role: 'organizer',
    })
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach',
    })
    const link = await createRecoveryLink(db, {
      targetUserId: coach.id,
      generatedByUserId: organizer.id,
      expiresAt: futureDate(60_000),
    })

    // Act
    const fetched = await getRecoveryLinkByToken(db, link.token)

    // Assert
    expect(fetched?.id).toBe(link.id)
    expect(fetched?.token).toBe(link.token)
  })

  it('returns null for an unknown token', async () => {
    // Arrange
    const db = await createTestDb()

    // Act
    const result = await getRecoveryLinkByToken(db, 'no-such-token')

    // Assert
    expect(result).toBeNull()
  })
})

describe('consumeRecoveryLink', () => {
  it('works once and records use (audit log)', async () => {
    // Arrange
    const db = await createTestDb()
    const organizer = await createAccount(db, {
      email: 'org@example.com',
      name: 'Organizer',
      role: 'organizer',
    })
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach',
    })
    const link = await createRecoveryLink(db, {
      targetUserId: coach.id,
      generatedByUserId: organizer.id,
      expiresAt: futureDate(60_000),
    })

    // Act
    const returnedUserId = await consumeRecoveryLink(db, link.token)

    // Assert — correct user is returned
    expect(returnedUserId).toBe(coach.id)

    // Assert — usedAt is now set (use log entry)
    const updated = await getRecoveryLinkByToken(db, link.token)
    expect(updated?.usedAt).toBeInstanceOf(Date)
  })

  it('rejects reuse of an already-consumed link', async () => {
    // Arrange
    const db = await createTestDb()
    const organizer = await createAccount(db, {
      email: 'org@example.com',
      name: 'Organizer',
      role: 'organizer',
    })
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach',
    })
    const link = await createRecoveryLink(db, {
      targetUserId: coach.id,
      generatedByUserId: organizer.id,
      expiresAt: futureDate(60_000),
    })
    await consumeRecoveryLink(db, link.token)

    // Act + Assert — second use throws
    await expect(consumeRecoveryLink(db, link.token)).rejects.toThrow(
      'Recovery link already used',
    )
  })

  it('rejects an expired link', async () => {
    // Arrange
    const db = await createTestDb()
    const organizer = await createAccount(db, {
      email: 'org@example.com',
      name: 'Organizer',
      role: 'organizer',
    })
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach',
    })
    const link = await createRecoveryLink(db, {
      targetUserId: coach.id,
      generatedByUserId: organizer.id,
      // Already expired
      expiresAt: new Date(Date.now() - 1000),
    })

    // Act + Assert
    await expect(consumeRecoveryLink(db, link.token)).rejects.toThrow(
      'Recovery link expired',
    )
  })

  it('rejects an unknown token', async () => {
    // Arrange
    const db = await createTestDb()

    // Act + Assert
    await expect(consumeRecoveryLink(db, 'ghost-token')).rejects.toThrow(
      'Recovery link not found',
    )
  })
})
