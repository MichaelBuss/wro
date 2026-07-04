import { createServerFn } from '@tanstack/solid-start'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { z } from 'zod'
import { getAuth } from '~/server/auth'
import { getDb } from '~/server/db/client'
import { createTeam, listTeamsByAccount, renameTeam } from '~/server/db/teams'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
})

const renameTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).max(100),
})

export const listTeamsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session?.user) throw new Error('Unauthorized')

    const db = await getDb()
    return listTeamsByAccount(db, session.user.id)
  },
)

export const createTeamFn = createServerFn({ method: 'POST' })
  .validator(createTeamSchema)
  .handler(async ({ data }) => {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session?.user) throw new Error('Unauthorized')

    const db = await getDb()
    return createTeam(db, { name: data.name, userId: session.user.id })
  })

export const renameTeamFn = createServerFn({ method: 'POST' })
  .validator(renameTeamSchema)
  .handler(async ({ data }) => {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session?.user) throw new Error('Unauthorized')

    const db = await getDb()
    return renameTeam(db, data.teamId, session.user.id, data.name)
  })
