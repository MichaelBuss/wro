import { describe, expect, it } from 'vitest'
import { decideOrganizerAccess } from './organizer-access'

describe('decideOrganizerAccess', () => {
  it('redirects to sign-in when there is no user', () => {
    const decision = decideOrganizerAccess(null)
    expect(decision).toEqual({ type: 'redirect', to: '/login' })
  })

  it('redirects to sign-in when user is undefined', () => {
    const decision = decideOrganizerAccess(undefined)
    expect(decision).toEqual({ type: 'redirect', to: '/login' })
  })

  it('redirects a coach to the dashboard', () => {
    const user = {
      id: 'u-1',
      name: 'Coach Nova',
      email: 'coach@example.com',
      role: 'coach' as const,
    }
    const decision = decideOrganizerAccess(user)
    expect(decision).toEqual({ type: 'redirect', to: '/dashboard' })
  })

  it('admits an organizer and returns the user', () => {
    const user = {
      id: 'u-2',
      name: 'Org Admin',
      email: 'admin@wro.dk',
      role: 'organizer' as const,
    }
    const decision = decideOrganizerAccess(user)
    expect(decision).toEqual({ type: 'allow', user })
  })
})
