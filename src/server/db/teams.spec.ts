import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createAccount } from './accounts'
import { category, event, team, teamMembership } from './schema'
import { seedBaselineEvent } from './seed'
import {
  addParticipant,
  confirmTeam,
  createTeam,
  getTeamWithDetails,
  listAllCategories,
  listAllTeamsForOrganizer,
  listTeamsByAccount,
  removeParticipant,
  renameTeam,
  returnTeamToDraft,
  setPaymentStatus,
  setTeamCategory,
  submitTeam,
  updateParticipant,
  updateTeamDetails,
  waitlistTeam,
  withdrawTeam,
  withdrawTeamAsOrganizer,
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

  // ---------------------------------------------------------------------------
  // Issue 004 — Registration lifecycle (coach side)
  // ---------------------------------------------------------------------------

  describe('registration lifecycle', () => {
    it('transitions a Draft to Submitted on submitTeam', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      expect(t.status).toBe('draft')

      // Act
      const updated = await submitTeam(db, t.id, coach.id)

      // Assert
      expect(updated.status).toBe('submitted')
    })

    it('rejects submitTeam from an Account that does not manage the Team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)
      const intruder = await createAccount(db, {
        email: 'intruder@example.com',
        name: 'Intruder',
      })

      // Act / Assert
      await expect(submitTeam(db, t.id, intruder.id)).rejects.toThrow(
        'not a member',
      )
    })

    it('rejects submitTeam when team is already Submitted', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act / Assert
      await expect(submitTeam(db, t.id, coach.id)).rejects.toThrow(
        'cannot submit a team in status "submitted"',
      )
    })

    it('rejects coach edits after team is Submitted', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act / Assert — all mutating operations should be rejected
      await expect(renameTeam(db, t.id, coach.id, 'New Name')).rejects.toThrow(
        'cannot be edited by a coach',
      )

      await expect(
        updateTeamDetails(db, t.id, coach.id, {
          responsibleAdultName: 'Jane',
          responsibleAdultPhone: '+45 20 00 00 00',
          responsibleAdultEmail: null,
          organization: null,
        }),
      ).rejects.toThrow('cannot be edited by a coach')

      await expect(
        addParticipant(db, t.id, coach.id, { name: 'Alice', birthYear: 2013 }),
      ).rejects.toThrow('cannot be edited by a coach')
    })

    it('withdraws a Submitted team to Withdrawn', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act
      const withdrawn = await withdrawTeam(db, t.id, coach.id)

      // Assert
      expect(withdrawn.status).toBe('withdrawn')
    })

    it('withdraws a Confirmed team to Withdrawn', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      // Manually force to confirmed (organizer action, done directly in DB for this test)
      await db
        .update(team)
        .set({ status: 'confirmed' })
        .where(eq(team.id, t.id))

      // Act
      const withdrawn = await withdrawTeam(db, t.id, coach.id)

      // Assert
      expect(withdrawn.status).toBe('withdrawn')
    })

    it('withdraws a Waitlisted team to Withdrawn', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await db
        .update(team)
        .set({ status: 'waitlisted' })
        .where(eq(team.id, t.id))

      // Act
      const withdrawn = await withdrawTeam(db, t.id, coach.id)

      // Assert
      expect(withdrawn.status).toBe('withdrawn')
    })

    it('rejects withdrawTeam from a Draft (invalid transition)', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)

      // Act / Assert
      await expect(withdrawTeam(db, t.id, coach.id)).rejects.toThrow(
        'cannot withdraw a team in status "draft"',
      )
    })

    it('rejects withdrawTeam from a Withdrawn team (invalid transition)', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await withdrawTeam(db, t.id, coach.id)

      // Act / Assert
      await expect(withdrawTeam(db, t.id, coach.id)).rejects.toThrow(
        'cannot withdraw a team in status "withdrawn"',
      )
    })

    it('rejects edits after the Event registration deadline has passed', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const { categories, event: seededEvent } = await seedBaselineEvent(db)

      // Assign a category so the team is tied to the event
      await setTeamCategory(db, t.id, coach.id, categories[0].id)

      // Set the deadline in the past
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await db
        .update(event)
        .set({ registrationDeadline: yesterday })
        .where(eq(event.id, seededEvent.id))

      // Act / Assert
      await expect(
        addParticipant(db, t.id, coach.id, { name: 'Alice', birthYear: 2013 }),
      ).rejects.toThrow('registration deadline has passed')

      await expect(renameTeam(db, t.id, coach.id, 'New Name')).rejects.toThrow(
        'registration deadline has passed',
      )
    })

    it('allows edits when the Event deadline is in the future', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const { categories, event: seededEvent } = await seedBaselineEvent(db)
      await setTeamCategory(db, t.id, coach.id, categories[0].id)

      // Set the deadline in the future
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await db
        .update(event)
        .set({ registrationDeadline: tomorrow })
        .where(eq(event.id, seededEvent.id))

      // Act / Assert — should succeed without throwing
      await expect(
        addParticipant(db, t.id, coach.id, { name: 'Alice', birthYear: 2013 }),
      ).resolves.toBeTruthy()
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

  // ---------------------------------------------------------------------------
  // Issue 005 — Organizer review actions + payment status
  // ---------------------------------------------------------------------------

  describe('organizer status transitions', () => {
    it('organizer can confirm a Submitted team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act
      const confirmed = await confirmTeam(db, t.id)

      // Assert
      expect(confirmed.status).toBe('confirmed')
    })

    it('organizer can confirm a Waitlisted team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await waitlistTeam(db, t.id)

      // Act
      const confirmed = await confirmTeam(db, t.id)

      // Assert
      expect(confirmed.status).toBe('confirmed')
    })

    it('rejects confirm on a Draft team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)

      // Act / Assert
      await expect(confirmTeam(db, t.id)).rejects.toThrow(
        'cannot confirm a team in status "draft"',
      )
    })

    it('organizer can waitlist a Submitted team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act
      const waitlisted = await waitlistTeam(db, t.id)

      // Assert
      expect(waitlisted.status).toBe('waitlisted')
    })

    it('organizer can waitlist a Confirmed team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await confirmTeam(db, t.id)

      // Act
      const waitlisted = await waitlistTeam(db, t.id)

      // Assert
      expect(waitlisted.status).toBe('waitlisted')
    })

    it('rejects waitlist on a Draft team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)

      // Act / Assert
      await expect(waitlistTeam(db, t.id)).rejects.toThrow(
        'cannot waitlist a team in status "draft"',
      )
    })

    it('organizer can return a Submitted team to Draft', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act
      const returned = await returnTeamToDraft(db, t.id)

      // Assert
      expect(returned.status).toBe('draft')
    })

    it('organizer can return a Confirmed team to Draft', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await confirmTeam(db, t.id)

      // Act
      const returned = await returnTeamToDraft(db, t.id)

      // Assert
      expect(returned.status).toBe('draft')
    })

    it('organizer can return a Waitlisted team to Draft', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await waitlistTeam(db, t.id)

      // Act
      const returned = await returnTeamToDraft(db, t.id)

      // Assert
      expect(returned.status).toBe('draft')
    })

    it('rejects return-to-draft on a Draft team', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)

      // Act / Assert
      await expect(returnTeamToDraft(db, t.id)).rejects.toThrow(
        'cannot return a team in status "draft" to draft',
      )
    })

    it('organizer can withdraw any non-withdrawn team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await confirmTeam(db, t.id)

      // Act
      const withdrawn = await withdrawTeamAsOrganizer(db, t.id)

      // Assert
      expect(withdrawn.status).toBe('withdrawn')
    })

    it('rejects organizer withdraw on an already-withdrawn team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await withdrawTeam(db, t.id, coach.id)

      // Act / Assert
      await expect(withdrawTeamAsOrganizer(db, t.id)).rejects.toThrow(
        'cannot withdraw a team in status "withdrawn"',
      )
    })

    it('organizer status changes are visible to the coach via listTeamsByAccount', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)

      // Act — organizer confirms
      await confirmTeam(db, t.id)

      // Assert — coach can see the updated status
      const coachTeams = await listTeamsByAccount(db, coach.id)
      expect(coachTeams[0]?.status).toBe('confirmed')
    })
  })

  describe('payment status', () => {
    it('new team defaults to unpaid payment status', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)

      // Assert
      expect(t.paymentStatus).toBe('unpaid')
    })

    it('organizer can set payment status to paid independently of registration status', async () => {
      // Arrange
      const db = await createTestDb()
      const { team: t } = await setupCoachAndTeam(db)

      // Act — set paid while still in draft
      const updated = await setPaymentStatus(db, t.id, 'paid')

      // Assert — payment updated, registration status unchanged
      expect(updated.paymentStatus).toBe('paid')
      expect(updated.status).toBe('draft')
    })

    it('organizer can set payment status to waived', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await confirmTeam(db, t.id)

      // Act
      const updated = await setPaymentStatus(db, t.id, 'waived')

      // Assert — payment waived, registration still confirmed
      expect(updated.paymentStatus).toBe('waived')
      expect(updated.status).toBe('confirmed')
    })

    it('payment status changes are independent of registration status changes', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      await submitTeam(db, t.id, coach.id)
      await setPaymentStatus(db, t.id, 'paid')

      // Act — registration status changes should not reset payment
      const confirmed = await confirmTeam(db, t.id)

      // Assert
      expect(confirmed.paymentStatus).toBe('paid')
      expect(confirmed.status).toBe('confirmed')
    })
  })

  describe('listAllTeamsForOrganizer', () => {
    it('returns all teams regardless of owning account', async () => {
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
      const all = await listAllTeamsForOrganizer(db)

      // Assert — organizer sees both teams
      expect(all).toHaveLength(2)
      const names = all.map((e) => e.team.name).sort()
      expect(names).toEqual(["Coach A's Team", "Coach B's Team"])
    })

    it('includes category and participants for each team', async () => {
      // Arrange
      const db = await createTestDb()
      const { coach, team: t } = await setupCoachAndTeam(db)
      const { categories } = await seedBaselineEvent(db)
      await setTeamCategory(db, t.id, coach.id, categories[0].id)
      await addParticipant(db, t.id, coach.id, {
        name: 'Alice',
        birthYear: 2013,
      })

      // Act
      const all = await listAllTeamsForOrganizer(db)

      // Assert
      expect(all).toHaveLength(1)
      const entry = all[0]
      expect(entry.category?.id).toBe(categories[0]?.id)
      expect(entry.participants).toHaveLength(1)
    })
  })
})
