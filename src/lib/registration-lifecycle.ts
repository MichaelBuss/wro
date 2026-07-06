import type { RegistrationStatus } from '~/server/db/schema'

/**
 * The single source of truth for the Team registration state machine.
 *
 * The lifecycle — Draft → Submitted → Confirmed / Waitlisted → Withdrawn — used
 * to live as six separate status-array constants in `server/db/teams.ts` plus
 * ad-hoc `status === '...'` checks scattered across three route files. Those
 * copies drifted: the organizer UI once disagreed with the server about whether
 * a draft team was withdrawable. This module owns the transition table so server
 * mutations and route UI can both derive their predicates from one place.
 *
 * See docs/architecture/team-registration.md for the domain narrative.
 */

/** Who is attempting a transition. Coaches and organizers have different powers. */
export type RegistrationActor = 'coach' | 'organizer'

/** The distinct actions that move a Team through its lifecycle. */
export type RegistrationAction =
  | 'submit'
  | 'confirm'
  | 'waitlist'
  | 'return'
  | 'withdraw'

interface Transition {
  readonly from: RegistrationStatus
  readonly action: RegistrationAction
  readonly actor: RegistrationActor
  readonly to: RegistrationStatus
}

/**
 * Every legal transition, reconstructed from the state diagram. Any change to
 * the rules — a new action, a widened source set — is made here and here only.
 */
const TRANSITIONS: ReadonlyArray<Transition> = [
  // Coach submits a draft for review.
  { from: 'draft', action: 'submit', actor: 'coach', to: 'submitted' },

  // Organizer confirms a place.
  { from: 'submitted', action: 'confirm', actor: 'organizer', to: 'confirmed' },
  {
    from: 'waitlisted',
    action: 'confirm',
    actor: 'organizer',
    to: 'confirmed',
  },

  // Organizer moves a team to the waitlist.
  {
    from: 'submitted',
    action: 'waitlist',
    actor: 'organizer',
    to: 'waitlisted',
  },
  {
    from: 'confirmed',
    action: 'waitlist',
    actor: 'organizer',
    to: 'waitlisted',
  },

  // Organizer returns a team to draft so the coach can edit again.
  { from: 'submitted', action: 'return', actor: 'organizer', to: 'draft' },
  { from: 'confirmed', action: 'return', actor: 'organizer', to: 'draft' },
  { from: 'waitlisted', action: 'return', actor: 'organizer', to: 'draft' },

  // Coach withdraws — only after submitting (a draft is deleted, not withdrawn).
  { from: 'submitted', action: 'withdraw', actor: 'coach', to: 'withdrawn' },
  { from: 'confirmed', action: 'withdraw', actor: 'coach', to: 'withdrawn' },
  { from: 'waitlisted', action: 'withdraw', actor: 'coach', to: 'withdrawn' },

  // Organizer withdraws — including a draft, which the coach cannot reach.
  { from: 'draft', action: 'withdraw', actor: 'organizer', to: 'withdrawn' },
  {
    from: 'submitted',
    action: 'withdraw',
    actor: 'organizer',
    to: 'withdrawn',
  },
  {
    from: 'confirmed',
    action: 'withdraw',
    actor: 'organizer',
    to: 'withdrawn',
  },
  {
    from: 'waitlisted',
    action: 'withdraw',
    actor: 'organizer',
    to: 'withdrawn',
  },
]

/**
 * Resolve the target status for a transition, or `null` if it is not allowed
 * from the given status for the given actor.
 */
export function resolveTransition(
  from: RegistrationStatus,
  action: RegistrationAction,
  actor: RegistrationActor,
): RegistrationStatus | null {
  const match = TRANSITIONS.find(
    (t) => t.from === from && t.action === action && t.actor === actor,
  )
  return match ? match.to : null
}

/** Whether the given actor may perform the given action from the given status. */
export function canTransition(
  from: RegistrationStatus,
  action: RegistrationAction,
  actor: RegistrationActor,
): boolean {
  return resolveTransition(from, action, actor) !== null
}

// ---------------------------------------------------------------------------
// Derived predicates — the surface UI and server mutations render/validate against
// ---------------------------------------------------------------------------

/**
 * Whether a coach may edit team details and participants. Editing is not a
 * status transition (it does not change the status) so it lives outside the
 * table: a team is coach-editable only while it is still a draft.
 */
export function isCoachEditable(status: RegistrationStatus): boolean {
  return status === 'draft'
}

/** Whether a coach may submit the team for review. */
export function canCoachSubmit(status: RegistrationStatus): boolean {
  return canTransition(status, 'submit', 'coach')
}

/** Whether a coach may withdraw the team. */
export function canCoachWithdraw(status: RegistrationStatus): boolean {
  return canTransition(status, 'withdraw', 'coach')
}

/** Whether an organizer may confirm the team. */
export function canOrganizerConfirm(status: RegistrationStatus): boolean {
  return canTransition(status, 'confirm', 'organizer')
}

/** Whether an organizer may waitlist the team. */
export function canOrganizerWaitlist(status: RegistrationStatus): boolean {
  return canTransition(status, 'waitlist', 'organizer')
}

/** Whether an organizer may return the team to draft. */
export function canOrganizerReturn(status: RegistrationStatus): boolean {
  return canTransition(status, 'return', 'organizer')
}

/** Whether an organizer may withdraw the team. */
export function canOrganizerWithdraw(status: RegistrationStatus): boolean {
  return canTransition(status, 'withdraw', 'organizer')
}
