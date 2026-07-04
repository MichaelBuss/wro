import { and, eq } from 'drizzle-orm'
import type { Database } from './client'
import { team, teamMembership } from './schema'
import type { TeamRow } from './schema'

/**
 * Data-layer accessors for Teams and the Account↔Team membership relationship.
 *
 * All mutating functions check membership before acting so that an Account
 * can never modify a Team it does not manage.
 */

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
