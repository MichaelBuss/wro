import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { z } from 'zod'
import { getAuth } from '~/server/auth'
import { getDb } from '~/server/db/client'
import {
  addParticipant,
  createTeam,
  getTeamWithDetails,
  listAllCategories,
  listTeamsByAccount,
  removeParticipant,
  renameTeam,
  setTeamCategory,
  submitTeam,
  updateParticipant,
  updateTeamDetails,
  withdrawTeam,
} from '~/server/db/teams'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
})

const renameTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).max(100),
})

const teamIdSchema = z.object({
  teamId: z.string().min(1),
})

const setCategorySchema = z.object({
  teamId: z.string().min(1),
  categoryId: z.string().min(1).nullable(),
})

const teamDetailFieldsSchema = z.object({
  teamId: z.string().min(1),
  responsibleAdultName: z.string().min(1).max(200).nullable(),
  responsibleAdultPhone: z.string().min(1).max(50).nullable(),
  responsibleAdultEmail: z
    .string()
    .email()
    .max(200)
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  organization: z.string().max(200).nullable(),
})

const addParticipantSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).max(200),
  birthYear: z.number().int().min(1990).max(2030),
})

const updateParticipantSchema = z.object({
  participantId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1).max(200),
  birthYear: z.number().int().min(1990).max(2030),
})

const removeParticipantSchema = z.object({
  participantId: z.string().min(1),
  teamId: z.string().min(1),
})

async function getAuthedUser() {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export const listTeamsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthedUser()
    const db = await getDb()
    return listTeamsByAccount(db, user.id)
  },
)

export const createTeamFn = createServerFn({ method: 'POST' })
  .validator(createTeamSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return createTeam(db, { name: data.name, userId: user.id })
  })

export const renameTeamFn = createServerFn({ method: 'POST' })
  .validator(renameTeamSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return renameTeam(db, data.teamId, user.id, data.name)
  })

export const getTeamDetailsFn = createServerFn({ method: 'GET' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return getTeamWithDetails(db, data.teamId, user.id)
  })

export const listAllCategoriesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await getAuthedUser()
    const db = await getDb()
    return listAllCategories(db)
  },
)

export const setCategoryFn = createServerFn({ method: 'POST' })
  .validator(setCategorySchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return setTeamCategory(db, data.teamId, user.id, data.categoryId)
  })

export const updateTeamDetailsFn = createServerFn({ method: 'POST' })
  .validator(teamDetailFieldsSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return updateTeamDetails(db, data.teamId, user.id, {
      responsibleAdultName: data.responsibleAdultName,
      responsibleAdultPhone: data.responsibleAdultPhone,
      responsibleAdultEmail: data.responsibleAdultEmail,
      organization: data.organization,
    })
  })

export const addParticipantFn = createServerFn({ method: 'POST' })
  .validator(addParticipantSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return addParticipant(db, data.teamId, user.id, {
      name: data.name,
      birthYear: data.birthYear,
    })
  })

export const updateParticipantFn = createServerFn({ method: 'POST' })
  .validator(updateParticipantSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return updateParticipant(db, data.participantId, data.teamId, user.id, {
      name: data.name,
      birthYear: data.birthYear,
    })
  })

export const removeParticipantFn = createServerFn({ method: 'POST' })
  .validator(removeParticipantSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return removeParticipant(db, data.participantId, data.teamId, user.id)
  })

export const submitTeamFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return submitTeam(db, data.teamId, user.id)
  })

export const withdrawTeamFn = createServerFn({ method: 'POST' })
  .validator(teamIdSchema)
  .handler(async ({ data }) => {
    const user = await getAuthedUser()
    const db = await getDb()
    return withdrawTeam(db, data.teamId, user.id)
  })
