import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createAccount } from './accounts'
import { team, teamMembership } from './schema'
import { createTeam, listTeamsByAccount, renameTeam } from './teams'
import { createTestDb } from './testing'

describe('teams data layer', () => {
  it('applies migrations cleanly — team and team_membership tables exist', async () => {
    // Arrange / Act
    const db = await createTestDb()

    // Assert — a missing table would make these selects throw
    await expect(db.select().from(team)).resolves.toEqual([])
    await expect(db.select().from(teamMembership)).resolves.toEqual([])
  })

  it('creates a Team linked to the creating Account and defaults it to Draft', async () => {
    // Arrange
    const db = await createTestDb()
    const account = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    // Act
    const created = await createTeam(db, {
      name: 'Team Alpha',
      userId: account.id,
    })

    // Assert
    expect(created.id).toBeTruthy()
    expect(created.name).toBe('Team Alpha')
    expect(created.status).toBe('draft')

    const memberships = await db
      .select()
      .from(teamMembership)
      .where(eq(teamMembership.teamId, created.id))
    expect(memberships).toHaveLength(1)
    expect(memberships[0]?.userId).toBe(account.id)
  })

  it('lists only the Teams managed by the given Account', async () => {
    // Arrange
    const db = await createTestDb()
    const coachA = await createAccount(db, {
      email: 'coach-a@example.com',
      name: 'Coach A',
    })
    const coachB = await createAccount(db, {
      email: 'coach-b@example.com',
      name: 'Coach B',
    })

    await createTeam(db, { name: "Coach A's Team", userId: coachA.id })
    await createTeam(db, { name: "Coach B's Team", userId: coachB.id })

    // Act
    const teamsForA = await listTeamsByAccount(db, coachA.id)

    // Assert — only Coach A's team is returned, not Coach B's
    expect(teamsForA).toHaveLength(1)
    expect(teamsForA[0]?.name).toBe("Coach A's Team")
  })

  it('lists all Teams for an Account that manages multiple Teams', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })

    await createTeam(db, { name: 'Team One', userId: coach.id })
    await createTeam(db, { name: 'Team Two', userId: coach.id })
    await createTeam(db, { name: 'Team Three', userId: coach.id })

    // Act
    const teams = await listTeamsByAccount(db, coach.id)

    // Assert
    expect(teams).toHaveLength(3)
    const names = teams.map((t) => t.name).sort()
    expect(names).toEqual(['Team One', 'Team Three', 'Team Two'])
  })

  it('returns an empty list for an Account with no Teams', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'new-coach@example.com',
      name: 'New Coach',
    })

    // Act
    const teams = await listTeamsByAccount(db, coach.id)

    // Assert
    expect(teams).toEqual([])
  })

  it('renames a Team and persists the new name', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const created = await createTeam(db, {
      name: 'Original Name',
      userId: coach.id,
    })

    // Act
    const updated = await renameTeam(db, created.id, coach.id, 'New Name')

    // Assert
    expect(updated.name).toBe('New Name')
    expect(updated.id).toBe(created.id)

    const teams = await listTeamsByAccount(db, coach.id)
    expect(teams[0]?.name).toBe('New Name')
  })

  it('rejects a rename from an Account that does not manage the Team', async () => {
    // Arrange
    const db = await createTestDb()
    const owner = await createAccount(db, {
      email: 'owner@example.com',
      name: 'Owner',
    })
    const intruder = await createAccount(db, {
      email: 'intruder@example.com',
      name: 'Intruder',
    })
    const created = await createTeam(db, {
      name: 'Protected Team',
      userId: owner.id,
    })

    // Act / Assert
    await expect(
      renameTeam(db, created.id, intruder.id, 'Hacked Name'),
    ).rejects.toThrow('not a member')
  })
})
