export type LoginAccess =
  | { type: 'allow' }
  | { type: 'redirect'; to: '/dashboard' }

/**
 * Pure guard for the login page: an already-authenticated user has no
 * reason to see the sign-in UI and is immediately bounced to their
 * dashboard. Kept side-effect-free so both branches are directly
 * testable without a router or a browser.
 */
export function decideLoginAccess(
  session: { user: unknown } | null | undefined,
): LoginAccess {
  if (session?.user) {
    return { type: 'redirect', to: '/dashboard' }
  }
  return { type: 'allow' }
}
