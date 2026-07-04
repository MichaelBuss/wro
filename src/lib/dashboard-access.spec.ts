import { describe, expect, it } from 'vitest'
import { decideDashboardAccess } from './dashboard-access'

describe('decideDashboardAccess', () => {
  it('redirects to sign-in when there is no session', () => {
    // Arrange / Act
    const decision = decideDashboardAccess(null)

    // Assert
    expect(decision).toEqual({ type: 'redirect', to: '/login' })
  })

  it('redirects to sign-in when the session is undefined', () => {
    // Arrange / Act
    const decision = decideDashboardAccess(undefined)

    // Assert
    expect(decision).toEqual({ type: 'redirect', to: '/login' })
  })

  it('admits an authenticated Account and exposes its identity', () => {
    // Arrange
    const user = {
      id: 'user-1',
      name: 'Coach Nova',
      email: 'coach@example.com',
    }

    // Act
    const decision = decideDashboardAccess({ user })

    // Assert
    expect(decision).toEqual({ type: 'allow', user })
  })
})
