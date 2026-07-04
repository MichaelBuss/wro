import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { z } from 'zod'
import { checkAgeBandEligibility } from '~/lib/age-band'
import { getAuth } from '~/server/auth'
import { getAccountById } from '~/server/db/accounts'
import { getDb } from '~/server/db/client'
import { paymentStatuses } from '~/server/db/schema'
import type { CategoryRow, ParticipantRow, TeamRow } from '~/server/db/schema'
import {
  confirmTeam,
  listAllTeamsForOrganizer,
  returnTeamToDraft,
  setPaymentStatus,
  waitlistTeam,
  withdrawTeamAsOrganizer,
} from '~/server/db/teams'
import type { TeamForOrganizer } from '~/server/db/teams'

/**
 * Assert the current request belongs to an organizer. Throws if unauthenticated
 * or if the account does not carry the organizer role. This is the
 * server-enforced gate for all organizer actions.
 */
async function assertOrganizer() {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user) throw new Error('Unauthorized')
  const db = await getDb()
  const userRow = await getAccountById(db, session.user.id)
  if (!userRow || userRow.role !== 'organizer') {
    throw new Error('Forbidden: organizer role required')
  }
  return session.user
}

// ---------------------------------------------------------------------------
// Enriched team type returned to organizer routes
// ---------------------------------------------------------------------------

export interface TeamSummaryForOrganizer {
  team: TeamRow
  category: CategoryRow | null
  participants: Array<ParticipantRow>
  hasEligibilityWarning: boolean
}

function enrichWithEligibility(raw: TeamForOrganizer): TeamSummaryForOrganizer {
  const cat = raw.category
  const hasEligibilityWarning =
    cat !== null &&
    raw.participants.some((p) => !checkAgeBandEligibility(p.birthYear, cat))
  return { ...raw, hasEligibilityWarning }
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const listAllTeamsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await assertOrganizer()
    const db = await getDb()
    const teams = await listAllTeamsForOrganizer(db)
    return teams.map(enrichWithEligibility)
  },
)

const teamIdSchema = z.object({ teamId: z.string().min(1) })

export const confirmTeamFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return confirmTeam(db, data.teamId)
  })

export const waitlistTeamFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return waitlistTeam(db, data.teamId)
  })

export const returnTeamToDraftFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return returnTeamToDraft(db, data.teamId)
  })

export const withdrawTeamAsOrganizerFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return withdrawTeamAsOrganizer(db, data.teamId)
  })

const setPaymentStatusSchema = z.object({
  teamId: z.string().min(1),
  paymentStatus: z.enum(paymentStatuses),
})

export const setPaymentStatusFn = createServerFn({ method: 'POST' })
  .validator(setPaymentStatusSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return setPaymentStatus(db, data.teamId, data.paymentStatus)
  })
