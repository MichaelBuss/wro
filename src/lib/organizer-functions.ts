import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { z } from 'zod'
import { checkAgeBandEligibility } from '~/lib/age-band'
import { getAuth } from '~/server/auth'
import { getAccountById } from '~/server/db/accounts'
import { getDb } from '~/server/db/client'
import { eventKinds, paymentStatuses } from '~/server/db/schema'
import type { CategoryRow, ParticipantRow, TeamRow } from '~/server/db/schema'
import {
  confirmTeam,
  createCategory,
  createEvent,
  listAllTeamsForOrganizer,
  listEventsWithCategories,
  removeCategory,
  returnTeamToDraft,
  setPaymentStatus,
  updateCategory,
  updateEvent,
  waitlistTeam,
  withdrawTeamAsOrganizer,
} from '~/server/db/teams'
import type { EventWithCategories, TeamForOrganizer } from '~/server/db/teams'

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

// ---------------------------------------------------------------------------
// Event & Category management server functions
// ---------------------------------------------------------------------------

export const listEventsWithCategoriesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await assertOrganizer()
  const db = await getDb()
  return listEventsWithCategories(db)
})

const eventSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(eventKinds),
  registrationDeadline: z.string().datetime({ offset: true }).nullable(),
})

export const createEventFn = createServerFn({ method: 'POST' })
  .validator(eventSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return createEvent(db, {
      name: data.name,
      kind: data.kind,
      registrationDeadline: data.registrationDeadline
        ? new Date(data.registrationDeadline)
        : null,
    })
  })

const updateEventSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(200),
  kind: z.enum(eventKinds),
  registrationDeadline: z.string().datetime({ offset: true }).nullable(),
})

export const updateEventFn = createServerFn({ method: 'POST' })
  .validator(updateEventSchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return updateEvent(db, data.eventId, {
      name: data.name,
      kind: data.kind,
      registrationDeadline: data.registrationDeadline
        ? new Date(data.registrationDeadline)
        : null,
    })
  })

const categorySchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(200),
  minBirthYear: z.number().int().min(1900).max(2100).nullable(),
  maxBirthYear: z.number().int().min(1900).max(2100).nullable(),
})

export const createCategoryFn = createServerFn({ method: 'POST' })
  .validator(categorySchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return createCategory(db, data.eventId, {
      name: data.name,
      minBirthYear: data.minBirthYear,
      maxBirthYear: data.maxBirthYear,
    })
  })

const updateCategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(200),
  minBirthYear: z.number().int().min(1900).max(2100).nullable(),
  maxBirthYear: z.number().int().min(1900).max(2100).nullable(),
})

export const updateCategoryFn = createServerFn({ method: 'POST' })
  .validator(updateCategorySchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    return updateCategory(db, data.categoryId, {
      name: data.name,
      minBirthYear: data.minBirthYear,
      maxBirthYear: data.maxBirthYear,
    })
  })

const removeCategorySchema = z.object({ categoryId: z.string().min(1) })

export const removeCategoryFn = createServerFn({ method: 'POST' })
  .validator(removeCategorySchema)
  .handler(async ({ data }) => {
    await assertOrganizer()
    const db = await getDb()
    await removeCategory(db, data.categoryId)
  })

export type { EventWithCategories }
