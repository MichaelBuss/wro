import { describe, expect, it } from 'vitest'
import {
  canCoachSubmit,
  canCoachWithdraw,
  canOrganizerConfirm,
  canOrganizerReturn,
  canOrganizerWaitlist,
  canOrganizerWithdraw,
  canTransition,
  isCoachEditable,
  resolveTransition,
} from './registration-lifecycle'

describe('resolveTransition', () => {
  it('returns the target status for a legal transition', () => {
    expect(resolveTransition('draft', 'submit', 'coach')).toBe('submitted')
    expect(resolveTransition('submitted', 'confirm', 'organizer')).toBe(
      'confirmed',
    )
    expect(resolveTransition('waitlisted', 'confirm', 'organizer')).toBe(
      'confirmed',
    )
    expect(resolveTransition('confirmed', 'return', 'organizer')).toBe('draft')
  })

  it('returns null when the action is not allowed from the status', () => {
    expect(resolveTransition('confirmed', 'submit', 'coach')).toBeNull()
    expect(resolveTransition('withdrawn', 'confirm', 'organizer')).toBeNull()
    expect(resolveTransition('draft', 'confirm', 'organizer')).toBeNull()
  })

  it('returns null when the actor lacks the power for the transition', () => {
    // A coach cannot confirm, waitlist, or return a team.
    expect(resolveTransition('submitted', 'confirm', 'coach')).toBeNull()
    expect(resolveTransition('submitted', 'waitlist', 'coach')).toBeNull()
    expect(resolveTransition('submitted', 'return', 'coach')).toBeNull()
  })
})

describe('coach withdraw vs organizer withdraw', () => {
  it('lets an organizer withdraw a draft team, but not a coach', () => {
    // Regression guard: the organizer UI once hid the withdraw button for
    // draft teams even though the server allowed it. A draft is only
    // organizer-withdrawable — a coach deletes a draft, they do not withdraw it.
    expect(canOrganizerWithdraw('draft')).toBe(true)
    expect(canCoachWithdraw('draft')).toBe(false)
  })

  it('lets both actors withdraw a submitted, confirmed, or waitlisted team', () => {
    for (const status of ['submitted', 'confirmed', 'waitlisted'] as const) {
      expect(canCoachWithdraw(status)).toBe(true)
      expect(canOrganizerWithdraw(status)).toBe(true)
    }
  })

  it('lets neither actor withdraw an already-withdrawn team', () => {
    expect(canCoachWithdraw('withdrawn')).toBe(false)
    expect(canOrganizerWithdraw('withdrawn')).toBe(false)
  })
})

describe('coach predicates', () => {
  it('only allows editing and submitting while a team is a draft', () => {
    expect(isCoachEditable('draft')).toBe(true)
    expect(canCoachSubmit('draft')).toBe(true)

    for (const status of [
      'submitted',
      'confirmed',
      'waitlisted',
      'withdrawn',
    ] as const) {
      expect(isCoachEditable(status)).toBe(false)
      expect(canCoachSubmit(status)).toBe(false)
    }
  })
})

describe('organizer review predicates', () => {
  it('allows confirming a submitted or waitlisted team', () => {
    expect(canOrganizerConfirm('submitted')).toBe(true)
    expect(canOrganizerConfirm('waitlisted')).toBe(true)
    expect(canOrganizerConfirm('confirmed')).toBe(false)
    expect(canOrganizerConfirm('draft')).toBe(false)
  })

  it('allows waitlisting a submitted or confirmed team', () => {
    expect(canOrganizerWaitlist('submitted')).toBe(true)
    expect(canOrganizerWaitlist('confirmed')).toBe(true)
    expect(canOrganizerWaitlist('waitlisted')).toBe(false)
    expect(canOrganizerWaitlist('draft')).toBe(false)
  })

  it('allows returning a submitted, confirmed, or waitlisted team to draft', () => {
    expect(canOrganizerReturn('submitted')).toBe(true)
    expect(canOrganizerReturn('confirmed')).toBe(true)
    expect(canOrganizerReturn('waitlisted')).toBe(true)
    expect(canOrganizerReturn('draft')).toBe(false)
    expect(canOrganizerReturn('withdrawn')).toBe(false)
  })
})

describe('canTransition', () => {
  it('agrees with resolveTransition', () => {
    expect(canTransition('draft', 'submit', 'coach')).toBe(true)
    expect(canTransition('draft', 'submit', 'organizer')).toBe(false)
  })
})
