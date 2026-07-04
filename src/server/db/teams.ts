import { and, eq } from 'drizzle-orm'
import type { Database } from './client'
import { category, event, participant, team, teamMembership } from './schema'
import type { CategoryRow, EventRow, ParticipantRow, TeamRow } from './schema'

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
  const membership = await db
    .select()
    .from(teamMembership)
    .where(
      and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId)),
    )
    .limit(1)

  if (!membership[0]) {
    throw new Error('renameTeam: account is not a member of this team')
  }

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
