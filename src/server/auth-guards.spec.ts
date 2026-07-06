import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRow } from '~/server/db/schema'

const getSession = vi.fn()
const getAccountById = vi.fn()

vi.mock('~/server/auth', () => ({
  getAuth: () => Promise.resolve({ api: { getSession } }),
}))

vi.mock('@tanstack/solid-start/server', () => ({
  getRequestHeaders: () => ({}),
}))

vi.mock('~/server/db/client', () => ({
  getDb: () => Promise.resolve({}),
}))

vi.mock('~/server/db/accounts', async () => ({
  ...(await vi.importActual('~/server/db/accounts')),
  getAccountById,
}))

const { requireAccount, requireOrganizer } = await import('./auth-guards')

const sessionUser = {
  id: 'u-1',
  name: 'Coach Nova',
  email: 'coach@example.com',
}

function accountRow(role: UserRow['role']): UserRow {
  return {
    id: 'u-1',
    name: 'Coach Nova',
    email: 'coach@example.com',
    emailVerified: true,
    image: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

beforeEach(() => {
  getSession.mockReset()
  getAccountById.mockReset()
})

describe('requireAccount', () => {
  it('returns the session user when signed in', async () => {
    getSession.mockResolvedValue({ user: sessionUser })
    await expect(requireAccount()).resolves.toEqual(sessionUser)
  })

  it('throws Unauthorized when there is no session', async () => {
    getSession.mockResolvedValue(null)
    await expect(requireAccount()).rejects.toThrow('Unauthorized')
  })
})

describe('requireOrganizer', () => {
  it('returns the account when the signed-in user is an organizer', async () => {
    getSession.mockResolvedValue({ user: sessionUser })
    const organizer = accountRow('organizer')
    getAccountById.mockResolvedValue(organizer)
    await expect(requireOrganizer()).resolves.toEqual(organizer)
  })

  it('throws Unauthorized when there is no session', async () => {
    getSession.mockResolvedValue(null)
    await expect(requireOrganizer()).rejects.toThrow('Unauthorized')
  })

  it('forbids a signed-in coach', async () => {
    getSession.mockResolvedValue({ user: sessionUser })
    getAccountById.mockResolvedValue(accountRow('coach'))
    await expect(requireOrganizer()).rejects.toThrow(
      'Forbidden: organizer role required',
    )
  })

  it('forbids a session whose account no longer exists', async () => {
    getSession.mockResolvedValue({ user: sessionUser })
    getAccountById.mockResolvedValue(null)
    await expect(requireOrganizer()).rejects.toThrow(
      'Forbidden: organizer role required',
    )
  })
})
