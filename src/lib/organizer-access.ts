import type { UserRole } from '~/server/db/schema'

/**
 * Minimal identity exposed to organizer-protected routes. Structurally extends
 * the base AuthUser shape with a role discriminant so the TypeScript type
 * reflects the invariant that callers inside the organizer guard have already
 * verified.
 */
export interface OrganizerUser {
  id: string
  name: string
  email: string
  role: 'organizer'
}

export type OrganizerAccess =
  | { type: 'allow'; user: OrganizerUser }
  | { type: 'redirect'; to: '/login' | '/dashboard' }

/**
 * Pure guard decision for organizer-protected routes. Unauthenticated visitors
 * are redirected to sign-in; authenticated non-organizers are redirected to
 * their own coach dashboard. Kept side-effect-free so both branches are
 * directly testable without a router or a browser.
 */
export function decideOrganizerAccess(
  user:
    | { id: string; name: string; email: string; role: UserRole }
    | null
    | undefined,
): OrganizerAccess {
  if (!user) return { type: 'redirect', to: '/login' }
  if (user.role !== 'organizer') return { type: 'redirect', to: '/dashboard' }
  return { type: 'allow', user: { ...user, role: 'organizer' as const } }
}
