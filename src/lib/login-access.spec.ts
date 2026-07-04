import { describe, expect, it } from 'vitest'
import { decideLoginAccess } from './login-access'

describe('decideLoginAccess', () => {
  it('allows an unauthenticated visitor', () => {
    const result = decideLoginAccess(null)
    expect(result).toEqual({ type: 'allow' })
  })

  it('allows when session is undefined', () => {
    const result = decideLoginAccess(undefined)
    expect(result).toEqual({ type: 'allow' })
  })

  it('redirects an already-authenticated user to the dashboard', () => {
    const session = {
      user: { id: 'u-1', name: 'Coach Nova', email: 'coach@example.com' },
    }
    const result = decideLoginAccess(session)
    expect(result).toEqual({ type: 'redirect', to: '/dashboard' })
  })
})
