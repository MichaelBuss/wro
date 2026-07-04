import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createAccount } from './accounts'
import { category, event, team, teamMembership } from './schema'
import { seedBaselineEvent } from './seed'
import {
  addParticipant,
  createTeam,
  getTeamWithDetails,
  listAllCategories,
  listTeamsByAccount,
  removeParticipant,
  renameTeam,
  setTeamCategory,
  updateParticipant,
  updateTeamDetails,
} from './teams'
import { createTestDb } from './testing'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupCoachAndTeam(db: Awaited<ReturnType<typeof createTestDb>>) {
  const coach = await createAccount(db, {
    email: 'coach@example.com',
    name: 'Coach Nova',
  })
  const t = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
  return { coach, team: t }
}

// ---------------------------------------------------------------------------
// Issue 002 tests (unchanged)
// ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Issue 003 — Category, Participants, Responsible Adult, Organization
  // ---------------------------------------------------------------------------

  describe('category assignment', () => {
    it('assigns a Category to a Team and persists it', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const { categories } = await seedBaselineEvent(db)
      expect(categories.length).toBeGreaterThan(0)
      const cat = categories[0]

      // Act
      const updated = await setTeamCategory(db, t.id, coach.id, cat.id)

      // Assert
      expect(updated.categoryId).toBe(cat.id)

      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.category?.id).toBe(cat.id)
      expect(details.category?.name).toBe(cat.name)
    })

    it('clears a Category when set to null', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const { categories } = await seedBaselineEvent(db)
      expect(categories.length).toBeGreaterThan(0)
      const cat = categories[0]
      await setTeamCategory(db, t.id, coach.id, cat.id)

      // Act
      const updated = await setTeamCategory(db, t.id, coach.id, null)

      // Assert
      expect(updated.categoryId).toBeNull()
    })

    it('rejects category assignment from an Account that does not manage the Team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)
      const intruder = await createAccount(db, {
        email: 'intruder@example.com',
        name: 'Intruder',
      })
      const { categories } = await seedBaselineEvent(db)
      expect(categories.length).toBeGreaterThan(0)
      const cat = categories[0]

      // Act / Assert
      await expect(
        setTeamCategory(db, t.id, intruder.id, cat.id),
      ).rejects.toThrow('not a member')
    })
  })

  describe('participants', () => {
    it('adds a Participant and returns the saved row', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)

      // Act
      const added = await addParticipant(db, t.id, coach.id, {
        name: 'Alice',
        birthYear: 2013,
      })

      // Assert
      expect(added.name).toBe('Alice')
      expect(added.birthYear).toBe(2013)
      expect(added.teamId).toBe(t.id)
    })

    it('multiple participants are all returned in getTeamWithDetails', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)

      await addParticipant(db, t.id, coach.id, {
        name: 'Alice',
        birthYear: 2013,
      })
      await addParticipant(db, t.id, coach.id, { name: 'Bob', birthYear: 2014 })
      await addParticipant(db, t.id, coach.id, {
        name: 'Carol',
        birthYear: 2012,
      })

      // Act
      const details = await getTeamWithDetails(db, t.id, coach.id)

      // Assert
      expect(details.participants).toHaveLength(3)
      const names = details.participants.map((p) => p.name).sort()
      expect(names).toEqual(['Alice', 'Bob', 'Carol'])
    })

    it('updates a Participant and persists the new values', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const added = await addParticipant(db, t.id, coach.id, {
        name: 'Alice',
        birthYear: 2013,
      })

      // Act
      const updated = await updateParticipant(db, added.id, t.id, coach.id, {
        name: 'Alice Updated',
        birthYear: 2012,
      })

      // Assert
      expect(updated.name).toBe('Alice Updated')
      expect(updated.birthYear).toBe(2012)

      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.participants[0]?.name).toBe('Alice Updated')
    })

    it('removes a Participant so it no longer appears in the Team details', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const added = await addParticipant(db, t.id, coach.id, {
        name: 'Alice',
        birthYear: 2013,
      })
      await addParticipant(db, t.id, coach.id, { name: 'Bob', birthYear: 2014 })

      // Act
      await removeParticipant(db, added.id, t.id, coach.id)

      // Assert
      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.participants).toHaveLength(1)
      expect(details.participants[0]?.name).toBe('Bob')
    })

    it('rejects participant operations from an Account that does not manage the Team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)
      const intruder = await createAccount(db, {
        email: 'intruder@example.com',
        name: 'Intruder',
      })

      // Act / Assert
      await expect(
        addParticipant(db, t.id, intruder.id, {
          name: 'Alice',
          birthYear: 2013,
        }),
      ).rejects.toThrow('not a member')
    })
  })

  describe('responsible adult and organization', () => {
    it('persists Responsible Adult fields and reloads them correctly', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)

      // Act
      await updateTeamDetails(db, t.id, coach.id, {
        responsibleAdultName: 'Jane Smith',
        responsibleAdultPhone: '+45 20 12 34 56',
        responsibleAdultEmail: 'jane@example.com',
        organization: 'Aarhus Robotics Club',
      })

      // Assert
      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.team.responsibleAdultName).toBe('Jane Smith')
      expect(details.team.responsibleAdultPhone).toBe('+45 20 12 34 56')
      expect(details.team.responsibleAdultEmail).toBe('jane@example.com')
      expect(details.team.organization).toBe('Aarhus Robotics Club')
    })

    it('allows optional fields (email, organization) to be null', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)

      // Act
      await updateTeamDetails(db, t.id, coach.id, {
        responsibleAdultName: 'Jane Smith',
        responsibleAdultPhone: '+45 20 12 34 56',
        responsibleAdultEmail: null,
        organization: null,
      })

      // Assert
      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.team.responsibleAdultEmail).toBeNull()
      expect(details.team.organization).toBeNull()
    })

    it('rejects updates from an Account that does not manage the Team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)
      const intruder = await createAccount(db, {
        email: 'intruder@example.com',
        name: 'Intruder',
      })

      // Act / Assert
      await expect(
        updateTeamDetails(db, t.id, intruder.id, {
          responsibleAdultName: 'Hacked',
          responsibleAdultPhone: null,
          responsibleAdultEmail: null,
          organization: null,
        }),
      ).rejects.toThrow('not a member')
    })
  })

  describe('events and categories', () => {
    it('seeded Event and Categories are listed by listAllCategories', async () => {
      // Arrange
      const db = await createTestDb()
      await seedBaselineEvent(db)

      // Act
      const categories = await listAllCategories(db)

      // Assert
      expect(categories.length).toBeGreaterThan(0)
      // All categories belong to the seeded event
      expect(categories.every((c) => c.eventName === 'WRO Denmark 2026')).toBe(
        true,
      )
    })

    it('seedBaselineEvent is idempotent — calling twice does not duplicate data', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      await seedBaselineEvent(db)
      await seedBaselineEvent(db)

      // Assert
      const categories = await db.select().from(category)
      const events = await db.select().from(event)
      expect(events).toHaveLength(1)
      // The seed inserts 6 categories; running twice should not double them.
      expect(categories).toHaveLength(6)
    })
  })
})
