/**
 * Minimal identity a protected route needs. Structurally satisfied by Better
 * Auth's `session.user`, so the guard logic stays decoupled from it.
 */
export interface AuthUser {
  id: string
  name: string
  email: string
}

export type DashboardAccess =
  | { type: 'allow'; user: AuthUser }
  | { type: 'redirect'; to: '/login' }

/**
 * Pure guard decision for the protected dashboard: signed-in Accounts are
 * admitted, everyone else is redirected to sign-in. Kept side-effect-free so
 * both branches are directly testable without a router or a browser.
 */
export function decideDashboardAccess(
  session: { user: AuthUser } | null | undefined,
): DashboardAccess {
  if (!session) {
    return { type: 'redirect', to: '/login' }
  }

  return { type: 'allow', user: session.user }
}
