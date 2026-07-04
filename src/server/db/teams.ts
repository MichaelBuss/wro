import { and, eq } from 'drizzle-orm'
import type { Database } from './client'
import { category, event, participant, team, teamMembership } from './schema'
import type {
  CategoryRow,
  EventKind,
  EventRow,
  ParticipantRow,
  PaymentStatus,
  RegistrationStatus,
  TeamRow,
} from './schema'

/**
 * Data-layer accessors for Teams, Participants, Events, and Categories.
 *
 * All mutating team functions check membership before acting so that an
 * Account can never modify a Team it does not manage.
 */

// ---------------------------------------------------------------------------
// Team membership guard
// ---------------------------------------------------------------------------

async function assertMembership(
  db: Database,
  teamId: string,
  userId: string,
  context: string,
): Promise<void> {
  const membership = await db
    .select()
    .from(teamMembership)
    .where(
      and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId)),
    )
    .limit(1)

  if (!membership[0]) {
    throw new Error(`${context}: account is not a member of this team`)
  }
}

// ---------------------------------------------------------------------------
// Basic team CRUD (from issue 002, unchanged)
// ---------------------------------------------------------------------------

export interface NewTeam {
  name: string
  userId: string
}

export async function createTeam(
  db: Database,
  input: NewTeam,
): Promise<TeamRow> {
  const now = new Date()
  const teamId = crypto.randomUUID()

  const rows = await db
    .insert(team)
    .values({
      id: teamId,
      name: input.name,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!rows[0]) {
    throw new Error('createTeam: INSERT returned no rows')
  }
  const teamRow = rows[0]

  await db.insert(teamMembership).values({
    id: crypto.randomUUID(),
    teamId: teamRow.id,
    userId: input.userId,
    createdAt: now,
  })

  return teamRow
}

export async function listTeamsByAccount(
  db: Database,
  userId: string,
): Promise<Array<TeamRow>> {
  const rows = await db
    .select({ team })
    .from(teamMembership)
    .innerJoin(team, eq(teamMembership.teamId, team.id))
    .where(eq(teamMembership.userId, userId))

  return rows.map((r) => r.team)
}

export async function renameTeam(
  db: Database,
  teamId: string,
  userId: string,
  name: string,
): Promise<TeamRow> {
  await assertMembership(db, teamId, userId, 'renameTeam')
  await assertCoachEditable(db, teamId, 'renameTeam')

  const rows = await db
    .update(team)
    .set({ name, updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()

  if (!rows[0]) {
    throw new Error('renameTeam: UPDATE returned no rows')
  }
  return rows[0]
}

// ---------------------------------------------------------------------------
// Registration lifecycle helpers
// ---------------------------------------------------------------------------

/** States from which a coach is allowed to edit team details / participants. */
const COACH_EDITABLE_STATUSES: ReadonlyArray<RegistrationStatus> = ['draft']

/** States from which a coach can withdraw a team. */
const WITHDRAWABLE_STATUSES: ReadonlyArray<RegistrationStatus> = [
  'submitted',
  'confirmed',
  'waitlisted',
]

/**
 * Asserts the team is still coach-editable (Draft status and before the event's
 * registration deadline if a category is assigned).
 */
async function assertCoachEditable(
  db: Database,
  teamId: string,
  context: string,
): Promise<void> {
  const teamRows = await db
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)

  if (!teamRows[0]) throw new Error(`${context}: team not found`)
  const teamRow = teamRows[0]

  if (!COACH_EDITABLE_STATUSES.includes(teamRow.status)) {
    throw new Error(
      `${context}: team is ${teamRow.status} and cannot be edited by a coach`,
    )
  }

  if (teamRow.categoryId) {
    const categoryRows = await db
      .select({ eventId: category.eventId })
      .from(category)
      .where(eq(category.id, teamRow.categoryId))
      .limit(1)

    if (categoryRows[0]) {
      const eventRows = await db
        .select({ registrationDeadline: event.registrationDeadline })
        .from(event)
        .where(eq(event.id, categoryRows[0].eventId))
        .limit(1)

      const deadline = eventRows[0]?.registrationDeadline
      if (deadline && new Date() > deadline) {
        throw new Error(
          `${context}: registration deadline has passed for this event`,
        )
      }
    }
  }
}

export async function submitTeam(
  db: Database,
  teamId: string,
  userId: string,
): Promise<TeamRow> {
  await assertMembership(db, teamId, userId, 'submitTeam')

  const teamRows = await db
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)

  if (!teamRows[0]) throw new Error('submitTeam: team not found')

  if (teamRows[0].status !== 'draft') {
    throw new Error(
      `submitTeam: cannot submit a team in status "${teamRows[0].status}"`,
    )
  }

  const rows = await db
    .update(team)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()

  if (!rows[0]) throw new Error('submitTeam: UPDATE returned no rows')
  return rows[0]
}

export async function withdrawTeam(
  db: Database,
  teamId: string,
  userId: string,
): Promise<TeamRow> {
  await assertMembership(db, teamId, userId, 'withdrawTeam')

  const teamRows = await db
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)

  if (!teamRows[0]) throw new Error('withdrawTeam: team not found')

  if (!WITHDRAWABLE_STATUSES.includes(teamRows[0].status)) {
    throw new Error(
      `withdrawTeam: cannot withdraw a team in status "${teamRows[0].status}"`,
    )
  }

  const rows = await db
    .update(team)
    .set({ status: 'withdrawn', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()

  if (!rows[0]) throw new Error('withdrawTeam: UPDATE returned no rows')
  return rows[0]
}

// ---------------------------------------------------------------------------
// Team detail — combined view
// ---------------------------------------------------------------------------

export interface TeamWithDetails {
  team: TeamRow
  category: CategoryRow | null
  participants: Array<ParticipantRow>
}

export async function getTeamWithDetails(
  db: Database,
  teamId: string,
  userId: string,
): Promise<TeamWithDetails> {
  await assertMembership(db, teamId, userId, 'getTeamWithDetails')

  const teamRows = await db
    .select()
    .from(team)
    .where(eq(team.id, teamId))
    .limit(1)

  if (teamRows.length === 0) {
    throw new Error('getTeamWithDetails: team not found')
  }

  const teamRow = teamRows[0]

  const categoryRows = teamRow.categoryId
    ? await db
        .select()
        .from(category)
        .where(eq(category.id, teamRow.categoryId))
        .limit(1)
    : []
  const categoryRow = categoryRows.length > 0 ? categoryRows[0] : null

  const participants = await db
    .select()
    .from(participant)
    .where(eq(participant.teamId, teamId))

  return { team: teamRow, category: categoryRow, participants }
}

// ---------------------------------------------------------------------------
// Category assignment
// ---------------------------------------------------------------------------

export async function setTeamCategory(
  db: Database,
  teamId: string,
  userId: string,
  categoryId: string | null,
): Promise<TeamRow> {
  await assertMembership(db, teamId, userId, 'setTeamCategory')
  await assertCoachEditable(db, teamId, 'setTeamCategory')

  const rows = await db
    .update(team)
    .set({ categoryId, updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()

  if (!rows[0]) {
    throw new Error('setTeamCategory: UPDATE returned no rows')
  }
  return rows[0]
}

// ---------------------------------------------------------------------------
// Team detail fields (Responsible Adult + Organization)
// ---------------------------------------------------------------------------

export interface TeamDetailFields {
  responsibleAdultName: string | null
  responsibleAdultPhone: string | null
  responsibleAdultEmail: string | null
  organization: string | null
}

export async function updateTeamDetails(
  db: Database,
  teamId: string,
  userId: string,
  fields: TeamDetailFields,
): Promise<TeamRow> {
  await assertMembership(db, teamId, userId, 'updateTeamDetails')
  await assertCoachEditable(db, teamId, 'updateTeamDetails')

  const rows = await db
    .update(team)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()

  if (!rows[0]) {
    throw new Error('updateTeamDetails: UPDATE returned no rows')
  }
  return rows[0]
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export interface NewParticipant {
  name: string
  birthYear: number
}

export async function addParticipant(
  db: Database,
  teamId: string,
  userId: string,
  input: NewParticipant,
): Promise<ParticipantRow> {
  await assertMembership(db, teamId, userId, 'addParticipant')
  await assertCoachEditable(db, teamId, 'addParticipant')

  const rows = await db
    .insert(participant)
    .values({
      id: crypto.randomUUID(),
      teamId,
      name: input.name,
      birthYear: input.birthYear,
      createdAt: new Date(),
    })
    .returning()

  if (!rows[0]) {
    throw new Error('addParticipant: INSERT returned no rows')
  }
  return rows[0]
}

export async function updateParticipant(
  db: Database,
  participantId: string,
  teamId: string,
  userId: string,
  input: NewParticipant,
): Promise<ParticipantRow> {
  await assertMembership(db, teamId, userId, 'updateParticipant')
  await assertCoachEditable(db, teamId, 'updateParticipant')

  const rows = await db
    .update(participant)
    .set({ name: input.name, birthYear: input.birthYear })
    .where(
      and(eq(participant.id, participantId), eq(participant.teamId, teamId)),
    )
    .returning()

  if (!rows[0]) {
    throw new Error('updateParticipant: UPDATE returned no rows')
  }
  return rows[0]
}

export async function removeParticipant(
  db: Database,
  participantId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  await assertMembership(db, teamId, userId, 'removeParticipant')
  await assertCoachEditable(db, teamId, 'removeParticipant')

  await db
    .delete(participant)
    .where(
      and(eq(participant.id, participantId), eq(participant.teamId, teamId)),
    )
}

// ---------------------------------------------------------------------------
// Events & Categories (read-only for coaches)
// ---------------------------------------------------------------------------

export async function listEvents(db: Database): Promise<Array<EventRow>> {
  return db.select().from(event)
}

export async function listCategoriesForEvent(
  db: Database,
  eventId: string,
): Promise<Array<CategoryRow>> {
  return db.select().from(category).where(eq(category.eventId, eventId))
}

export async function listAllCategories(
  db: Database,
): Promise<Array<CategoryRow & { eventName: string }>> {
  const rows = await db
    .select({
      id: category.id,
      eventId: category.eventId,
      name: category.name,
      minBirthYear: category.minBirthYear,
      maxBirthYear: category.maxBirthYear,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      eventName: event.name,
    })
    .from(category)
    .innerJoin(event, eq(category.eventId, event.id))

  return rows
}

// ---------------------------------------------------------------------------
// Events & Categories — organizer CRUD
// ---------------------------------------------------------------------------

export interface EventWithCategories {
  event: EventRow
  categories: Array<CategoryRow>
}

export async function listEventsWithCategories(
  db: Database,
): Promise<Array<EventWithCategories>> {
  const events = await db.select().from(event)
  const result: Array<EventWithCategories> = []

  for (const e of events) {
    const categories = await db
      .select()
      .from(category)
      .where(eq(category.eventId, e.id))
    result.push({ event: e, categories })
  }

  return result
}

export interface NewEventInput {
  name: string
  kind: EventKind
  registrationDeadline: Date | null
}

export async function createEvent(
  db: Database,
  input: NewEventInput,
): Promise<EventRow> {
  const now = new Date()
  const rows = await db
    .insert(event)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      kind: input.kind,
      registrationDeadline: input.registrationDeadline,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!rows[0]) throw new Error('createEvent: INSERT returned no rows')
  return rows[0]
}

export async function updateEvent(
  db: Database,
  eventId: string,
  input: NewEventInput,
): Promise<EventRow> {
  const rows = await db
    .update(event)
    .set({
      name: input.name,
      kind: input.kind,
      registrationDeadline: input.registrationDeadline,
      updatedAt: new Date(),
    })
    .where(eq(event.id, eventId))
    .returning()

  if (!rows[0]) throw new Error('updateEvent: event not found')
  return rows[0]
}

export interface NewCategoryInput {
  name: string
  minBirthYear: number | null
  maxBirthYear: number | null
}

export async function createCategory(
  db: Database,
  eventId: string,
  input: NewCategoryInput,
): Promise<CategoryRow> {
  const now = new Date()
  const rows = await db
    .insert(category)
    .values({
      id: crypto.randomUUID(),
      eventId,
      name: input.name,
      minBirthYear: input.minBirthYear,
      maxBirthYear: input.maxBirthYear,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!rows[0]) throw new Error('createCategory: INSERT returned no rows')
  return rows[0]
}

export async function updateCategory(
  db: Database,
  categoryId: string,
  input: NewCategoryInput,
): Promise<CategoryRow> {
  const rows = await db
    .update(category)
    .set({
      name: input.name,
      minBirthYear: input.minBirthYear,
      maxBirthYear: input.maxBirthYear,
      updatedAt: new Date(),
    })
    .where(eq(category.id, categoryId))
    .returning()

  if (!rows[0]) throw new Error('updateCategory: category not found')
  return rows[0]
}

/**
 * Removes a Category. Teams referencing it have their categoryId set to null
 * by the ON DELETE SET NULL foreign key constraint — no orphaned references.
 */
export async function removeCategory(
  db: Database,
  categoryId: string,
): Promise<void> {
  await db.delete(category).where(eq(category.id, categoryId))
}

// ---------------------------------------------------------------------------
// Organizer actions — no membership check; role enforcement is at the server
// function layer (see lib/organizer-functions.ts).
// ---------------------------------------------------------------------------

export interface TeamForOrganizer {
  team: TeamRow
  category: CategoryRow | null
  participants: Array<ParticipantRow>
}

/**
 * Registration row returned for the per-event CSV export.
 * Teams without a category are not included (they cannot belong to any event).
 */
export interface TeamRegistrationRow {
  team: TeamRow
  categoryName: string
  participants: Array<ParticipantRow>
}

/**
 * Collect all Teams registered to a given Event (via their Category assignment).
 * Returns one entry per Team with the category name and its participants.
 * Teams with no Category cannot belong to an event and are excluded.
 */
export async function exportTeamsForEvent(
  db: Database,
  eventId: string,
): Promise<Array<TeamRegistrationRow>> {
  const teamsWithCategory = await db
    .select({ team, categoryName: category.name })
    .from(team)
    .innerJoin(category, eq(team.categoryId, category.id))
    .where(eq(category.eventId, eventId))

  const result: Array<TeamRegistrationRow> = []

  for (const row of teamsWithCategory) {
    const participants = await db
      .select()
      .from(participant)
      .where(eq(participant.teamId, row.team.id))

    result.push({
      team: row.team,
      categoryName: row.categoryName,
      participants,
    })
  }

  return result
}

export async function listAllTeamsForOrganizer(
  db: Database,
): Promise<Array<TeamForOrganizer>> {
  const teams = await db.select().from(team)
  const result: Array<TeamForOrganizer> = []

  for (const t of teams) {
    const participants = await db
      .select()
      .from(participant)
      .where(eq(participant.teamId, t.id))

    const cat = t.categoryId
      ? ((
          await db
            .select()
            .from(category)
            .where(eq(category.id, t.categoryId))
            .limit(1)
        )[0] ?? null)
      : null

    result.push({ team: t, category: cat, participants })
  }

  return result
}

/** Valid source statuses for an organizer's confirm action. */
const ORGANIZER_CONFIRMABLE_STATUSES: ReadonlyArray<RegistrationStatus> = [
  'submitted',
  'waitlisted',
]

export async function confirmTeam(
  db: Database,
  teamId: string,
): Promise<TeamRow> {
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (!rows[0]) throw new Error('confirmTeam: team not found')
  if (!ORGANIZER_CONFIRMABLE_STATUSES.includes(rows[0].status)) {
    throw new Error(
      `confirmTeam: cannot confirm a team in status "${rows[0].status}"`,
    )
  }
  const updated = await db
    .update(team)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()
  if (!updated[0]) throw new Error('confirmTeam: UPDATE returned no rows')
  return updated[0]
}

/** Valid source statuses for an organizer's waitlist action. */
const ORGANIZER_WAITLISTABLE_STATUSES: ReadonlyArray<RegistrationStatus> = [
  'submitted',
  'confirmed',
]

export async function waitlistTeam(
  db: Database,
  teamId: string,
): Promise<TeamRow> {
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (!rows[0]) throw new Error('waitlistTeam: team not found')
  if (!ORGANIZER_WAITLISTABLE_STATUSES.includes(rows[0].status)) {
    throw new Error(
      `waitlistTeam: cannot waitlist a team in status "${rows[0].status}"`,
    )
  }
  const updated = await db
    .update(team)
    .set({ status: 'waitlisted', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()
  if (!updated[0]) throw new Error('waitlistTeam: UPDATE returned no rows')
  return updated[0]
}

/** Valid source statuses for an organizer's return-to-draft action. */
const ORGANIZER_RETURNABLE_STATUSES: ReadonlyArray<RegistrationStatus> = [
  'submitted',
  'confirmed',
  'waitlisted',
]

export async function returnTeamToDraft(
  db: Database,
  teamId: string,
): Promise<TeamRow> {
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (!rows[0]) throw new Error('returnTeamToDraft: team not found')
  if (!ORGANIZER_RETURNABLE_STATUSES.includes(rows[0].status)) {
    throw new Error(
      `returnTeamToDraft: cannot return a team in status "${rows[0].status}" to draft`,
    )
  }
  const updated = await db
    .update(team)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()
  if (!updated[0]) throw new Error('returnTeamToDraft: UPDATE returned no rows')
  return updated[0]
}

/** Valid source statuses for an organizer's withdraw action. */
const ORGANIZER_WITHDRAWABLE_STATUSES: ReadonlyArray<RegistrationStatus> = [
  'submitted',
  'confirmed',
  'waitlisted',
  'draft',
]

export async function withdrawTeamAsOrganizer(
  db: Database,
  teamId: string,
): Promise<TeamRow> {
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (!rows[0]) throw new Error('withdrawTeamAsOrganizer: team not found')
  if (!ORGANIZER_WITHDRAWABLE_STATUSES.includes(rows[0].status)) {
    throw new Error(
      `withdrawTeamAsOrganizer: cannot withdraw a team in status "${rows[0].status}"`,
    )
  }
  const updated = await db
    .update(team)
    .set({ status: 'withdrawn', updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()
  if (!updated[0])
    throw new Error('withdrawTeamAsOrganizer: UPDATE returned no rows')
  return updated[0]
}

export async function setPaymentStatus(
  db: Database,
  teamId: string,
  status: PaymentStatus,
): Promise<TeamRow> {
  const rows = await db.select().from(team).where(eq(team.id, teamId)).limit(1)
  if (!rows[0]) throw new Error('setPaymentStatus: team not found')
  const updated = await db
    .update(team)
    .set({ paymentStatus: status, updatedAt: new Date() })
    .where(eq(team.id, teamId))
    .returning()
  if (!updated[0]) throw new Error('setPaymentStatus: UPDATE returned no rows')
  return updated[0]
}
