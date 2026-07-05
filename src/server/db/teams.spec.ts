import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createAccount } from './accounts'
import { category, event, team, teamMembership } from './schema'
import { seedBaselineEvent } from './seed'
import {
  addParticipant,
  confirmTeam,
  createCategory,
  createEvent,
  createTeam,
  exportTeamsForEvent,
  getTeamWithDetails,
  listAllCategories,
  listAllTeamsForOrganizer,
  listEventsWithCategories,
  listTeamsByAccount,
  removeCategory,
  removeParticipant,
  renameTeam,
  returnTeamToDraft,
  setPaymentStatus,
  setTeamCategory,
  submitTeam,
  updateCategory,
  updateEvent,
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

// ---------------------------------------------------------------------------
// Issue 006 — Organizer manages Events & Categories
// ---------------------------------------------------------------------------

describe('event and category management', () => {
  describe('createEvent', () => {
    it('creates a Competition event with a registration deadline', async () => {
      // Arrange
      const db = await createTestDb()
      const deadline = new Date('2027-09-01T12:00:00Z')

      // Act
      const created = await createEvent(db, {
        name: 'WRO Denmark 2027',
        kind: 'competition',
        registrationDeadline: deadline,
      })

      // Assert
      expect(created.id).toBeTruthy()
      expect(created.name).toBe('WRO Denmark 2027')
      expect(created.kind).toBe('competition')
      expect(created.registrationDeadline?.toISOString()).toBe(
        deadline.toISOString(),
      )
    })

    it('creates a Gathering event without a deadline', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      const created = await createEvent(db, {
        name: 'Summer Gathering 2027',
        kind: 'gathering',
        registrationDeadline: null,
      })

      // Assert
      expect(created.kind).toBe('gathering')
      expect(created.registrationDeadline).toBeNull()
    })

    it('persists the new event so it appears in listEventsWithCategories', async () => {
      // Arrange
      const db = await createTestDb()

      // Act
      await createEvent(db, {
        name: 'WRO Denmark 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const results = await listEventsWithCategories(db)

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0]?.event.name).toBe('WRO Denmark 2027')
      expect(results[0]?.categories).toHaveLength(0)
    })
  })

  describe('updateEvent', () => {
    it('updates event name, kind, and deadline', async () => {
      // Arrange
      const db = await createTestDb()
      const created = await createEvent(db, {
        name: 'Old Name',
        kind: 'competition',
        registrationDeadline: null,
      })
      const newDeadline = new Date('2027-10-01T00:00:00Z')

      // Act
      const updated = await updateEvent(db, created.id, {
        name: 'New Name',
        kind: 'gathering',
        registrationDeadline: newDeadline,
      })

      // Assert
      expect(updated.name).toBe('New Name')
      expect(updated.kind).toBe('gathering')
      expect(updated.registrationDeadline?.toISOString()).toBe(
        newDeadline.toISOString(),
      )
    })

    it('clears the deadline when updated to null', async () => {
      // Arrange
      const db = await createTestDb()
      const created = await createEvent(db, {
        name: 'Deadline Event',
        kind: 'competition',
        registrationDeadline: new Date('2027-09-01T12:00:00Z'),
      })

      // Act
      const updated = await updateEvent(db, created.id, {
        name: created.name,
        kind: created.kind,
        registrationDeadline: null,
      })

      // Assert
      expect(updated.registrationDeadline).toBeNull()
    })

    it('throws when the event does not exist', async () => {
      // Arrange
      const db = await createTestDb()

      // Act / Assert
      await expect(
        updateEvent(db, 'nonexistent-id', {
          name: 'Ghost',
          kind: 'competition',
          registrationDeadline: null,
        }),
      ).rejects.toThrow('event not found')
    })
  })

  describe('createCategory', () => {
    it('adds a Category to a Competition event and persists it', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })

      // Act
      const cat = await createCategory(db, ev.id, {
        name: 'RoboMission Junior',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })

      // Assert
      expect(cat.id).toBeTruthy()
      expect(cat.eventId).toBe(ev.id)
      expect(cat.name).toBe('RoboMission Junior')
      expect(cat.minBirthYear).toBe(2011)
      expect(cat.maxBirthYear).toBe(2015)
    })

    it('allows a Category with no age band (gathering use case)', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'RSVP Gathering',
        kind: 'gathering',
        registrationDeadline: null,
      })

      // Act
      const cat = await createCategory(db, ev.id, {
        name: 'Open',
        minBirthYear: null,
        maxBirthYear: null,
      })

      // Assert
      expect(cat.minBirthYear).toBeNull()
      expect(cat.maxBirthYear).toBeNull()
    })

    it('appears in listEventsWithCategories after being created', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      await createCategory(db, ev.id, {
        name: 'RoboMission Junior',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })
      await createCategory(db, ev.id, {
        name: 'Future Innovators',
        minBirthYear: 2009,
        maxBirthYear: 2018,
      })

      // Act
      const results = await listEventsWithCategories(db)

      // Assert
      expect(results).toHaveLength(1)
      expect(results[0]?.categories).toHaveLength(2)
      const names = results[0]?.categories.map((c) => c.name).sort()
      expect(names).toEqual(['Future Innovators', 'RoboMission Junior'])
    })
  })

  describe('updateCategory', () => {
    it('updates name and age band of an existing Category', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const cat = await createCategory(db, ev.id, {
        name: 'Old Name',
        minBirthYear: 2010,
        maxBirthYear: 2014,
      })

      // Act
      const updated = await updateCategory(db, cat.id, {
        name: 'New Name',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })

      // Assert
      expect(updated.name).toBe('New Name')
      expect(updated.minBirthYear).toBe(2011)
      expect(updated.maxBirthYear).toBe(2015)
      expect(updated.id).toBe(cat.id)
    })

    it('renaming a Category does not break Teams that reference it', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const cat = await createCategory(db, ev.id, {
        name: 'RoboMission Junior',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })
      const coach = await createAccount(db, {
        email: 'coach@example.com',
        name: 'Coach',
      })
      const t = await createTeam(db, { name: 'Team A', userId: coach.id })
      await setTeamCategory(db, t.id, coach.id, cat.id)

      // Act
      await updateCategory(db, cat.id, {
        name: 'RoboMission Junior (Renamed)',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })

      // Assert — Team still references the category (by id), and the category has the new name
      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.category?.id).toBe(cat.id)
      expect(details.category?.name).toBe('RoboMission Junior (Renamed)')
    })

    it('throws when the category does not exist', async () => {
      // Arrange
      const db = await createTestDb()

      // Act / Assert
      await expect(
        updateCategory(db, 'nonexistent-id', {
          name: 'Ghost',
          minBirthYear: null,
          maxBirthYear: null,
        }),
      ).rejects.toThrow('category not found')
    })
  })

  describe('removeCategory', () => {
    it('removes a Category and Teams referencing it get categoryId set to null', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const cat = await createCategory(db, ev.id, {
        name: 'RoboMission Junior',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })
      const coach = await createAccount(db, {
        email: 'coach@example.com',
        name: 'Coach',
      })
      const t = await createTeam(db, { name: 'Team A', userId: coach.id })
      await setTeamCategory(db, t.id, coach.id, cat.id)

      // Confirm the team references the category before removal
      const before = await getTeamWithDetails(db, t.id, coach.id)
      expect(before.category?.id).toBe(cat.id)

      // Act
      await removeCategory(db, cat.id)

      // Assert — team's categoryId is now null (no orphaned reference)
      const after = await getTeamWithDetails(db, t.id, coach.id)
      expect(after.category).toBeNull()
      expect(after.team.categoryId).toBeNull()
    })

    it('removes a Category that no Team references without error', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const cat = await createCategory(db, ev.id, {
        name: 'Unused Category',
        minBirthYear: null,
        maxBirthYear: null,
      })

      // Act / Assert — should not throw
      await expect(removeCategory(db, cat.id)).resolves.toBeUndefined()

      const results = await listEventsWithCategories(db)
      expect(results[0]?.categories).toHaveLength(0)
    })
  })

  describe('coach registration reads from managed data', () => {
    it('listAllCategories returns categories from organizer-created events, not only seeds', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'Organizer-Created Event',
        kind: 'competition',
        registrationDeadline: null,
      })
      await createCategory(db, ev.id, {
        name: 'Managed Category',
        minBirthYear: 2010,
        maxBirthYear: 2016,
      })

      // Act
      const categories = await listAllCategories(db)

      // Assert — coach picker reads from DB, not hardcoded seed
      expect(categories).toHaveLength(1)
      expect(categories[0]?.name).toBe('Managed Category')
      expect(categories[0]?.eventName).toBe('Organizer-Created Event')
    })

    it('a coach can assign a team to an organizer-created Category', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'WRO 2027',
        kind: 'competition',
        registrationDeadline: null,
      })
      const cat = await createCategory(db, ev.id, {
        name: 'RoboMission Junior',
        minBirthYear: 2011,
        maxBirthYear: 2015,
      })
      const coach = await createAccount(db, {
        email: 'coach@example.com',
        name: 'Coach',
      })
      const t = await createTeam(db, { name: 'Team A', userId: coach.id })

      // Act
      await setTeamCategory(db, t.id, coach.id, cat.id)

      // Assert
      const details = await getTeamWithDetails(db, t.id, coach.id)
      expect(details.category?.id).toBe(cat.id)
      expect(details.category?.name).toBe('RoboMission Junior')
    })
  })

  describe('gathering events', () => {
    it('a Gathering event can have categories (optional RSVP use)', async () => {
      // Arrange
      const db = await createTestDb()
      const ev = await createEvent(db, {
        name: 'Summer Gathering',
        kind: 'gathering',
        registrationDeadline: null,
      })

      // Act — adding a category to a gathering should not error
      const cat = await createCategory(db, ev.id, {
        name: 'Open',
        minBirthYear: null,
        maxBirthYear: null,
      })

      // Assert
      expect(cat.eventId).toBe(ev.id)
    })

    it('a Gathering event can exist with no categories', async () => {
      // Arrange
      const db = await createTestDb()
      await createEvent(db, {
        name: 'Open Day',
        kind: 'gathering',
        registrationDeadline: null,
      })

      // Act
      const results = await listEventsWithCategories(db)

      // Assert — gathering event with zero categories is valid
      expect(results).toHaveLength(1)
      expect(results[0]?.event.kind).toBe('gathering')
      expect(results[0]?.categories).toHaveLength(0)
    })
  })
})

// ---------------------------------------------------------------------------
// Issue 008: exportTeamsForEvent — organizer per-event CSV data layer
// ---------------------------------------------------------------------------

describe('exportTeamsForEvent', () => {
  it('returns one entry per team registered to the given Event', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const ev = await createEvent(db, {
      name: 'WRO 2026',
      kind: 'competition',
      registrationDeadline: null,
    })
    const cat = await createCategory(db, ev.id, {
      name: 'RoboMission Senior',
      minBirthYear: null,
      maxBirthYear: null,
    })
    const t1 = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
    const t2 = await createTeam(db, { name: 'Team Beta', userId: coach.id })
    await setTeamCategory(db, t1.id, coach.id, cat.id)
    await setTeamCategory(db, t2.id, coach.id, cat.id)

    // Act
    const result = await exportTeamsForEvent(db, ev.id)

    // Assert
    expect(result).toHaveLength(2)
    const names = result.map((r) => r.team.name)
    expect(names).toContain('Team Alpha')
    expect(names).toContain('Team Beta')
  })

  it('includes the category name and participants for each team', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const ev = await createEvent(db, {
      name: 'WRO 2026',
      kind: 'competition',
      registrationDeadline: null,
    })
    const cat = await createCategory(db, ev.id, {
      name: 'RoboMission Junior',
      minBirthYear: null,
      maxBirthYear: null,
    })
    const t = await createTeam(db, { name: 'Team Alpha', userId: coach.id })
    await setTeamCategory(db, t.id, coach.id, cat.id)
    await addParticipant(db, t.id, coach.id, { name: 'Alice', birthYear: 2012 })
    await addParticipant(db, t.id, coach.id, { name: 'Bob', birthYear: 2013 })

    // Act
    const result = await exportTeamsForEvent(db, ev.id)

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0]?.categoryName).toBe('RoboMission Junior')
    expect(result[0]?.participants).toHaveLength(2)
    const participantNames = result[0]?.participants.map((p) => p.name)
    expect(participantNames).toContain('Alice')
    expect(participantNames).toContain('Bob')
  })

  it('does not include teams registered to a different Event', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const ev1 = await createEvent(db, {
      name: 'WRO 2025',
      kind: 'competition',
      registrationDeadline: null,
    })
    const ev2 = await createEvent(db, {
      name: 'WRO 2026',
      kind: 'competition',
      registrationDeadline: null,
    })
    const cat1 = await createCategory(db, ev1.id, {
      name: 'Cat A',
      minBirthYear: null,
      maxBirthYear: null,
    })
    const cat2 = await createCategory(db, ev2.id, {
      name: 'Cat B',
      minBirthYear: null,
      maxBirthYear: null,
    })
    const t1 = await createTeam(db, { name: 'Team 2025', userId: coach.id })
    const t2 = await createTeam(db, { name: 'Team 2026', userId: coach.id })
    await setTeamCategory(db, t1.id, coach.id, cat1.id)
    await setTeamCategory(db, t2.id, coach.id, cat2.id)

    // Act — export only ev2
    const result = await exportTeamsForEvent(db, ev2.id)

    // Assert — only the team in ev2 is returned
    expect(result).toHaveLength(1)
    expect(result[0]?.team.name).toBe('Team 2026')
  })

  it('returns an empty array when the Event has no registrations', async () => {
    // Arrange
    const db = await createTestDb()
    const ev = await createEvent(db, {
      name: 'Empty Event',
      kind: 'competition',
      registrationDeadline: null,
    })

    // Act
    const result = await exportTeamsForEvent(db, ev.id)

    // Assert
    expect(result).toHaveLength(0)
  })

  it('excludes teams with no category (they belong to no event)', async () => {
    // Arrange
    const db = await createTestDb()
    const coach = await createAccount(db, {
      email: 'coach@example.com',
      name: 'Coach Nova',
    })
    const ev = await createEvent(db, {
      name: 'WRO 2026',
      kind: 'competition',
      registrationDeadline: null,
    })
    // Team with no category
    await createTeam(db, { name: 'Unassigned Team', userId: coach.id })

    // Act
    const result = await exportTeamsForEvent(db, ev.id)

    // Assert — uncategorised team is not in the export
    expect(result).toHaveLength(0)
  })
})
