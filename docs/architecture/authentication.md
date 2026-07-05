---
name: Authentication (Passkeys-Only)
status: implemented
authors:
  - Michael
created: 2026-07-04
updated: 2026-07-04
relatedPlans:
  - team-registration
  - data-persistence
overview: >
  Passkey-only (WebAuthn) authentication via Better Auth for coach and organizer
  accounts, with no passwords and no email sending. Recovery is an
  organizer-generated one-time link delivered manually; the organizer role is
  bootstrapped via an env email allowlist.
---

# Authentication (Passkeys-Only)

> **Status**: Implemented (July 2026).

## Table of Contents

1. [Problem / Context](#problem--context)
2. [Decision](#decision)
3. [Why Passkeys-Only](#why-passkeys-only)
4. [No Email, By Design](#no-email-by-design)
5. [Account Recovery](#account-recovery)
6. [Organizer Role & Bootstrapping](#organizer-role--bootstrapping)
7. [Fit With the Stack](#fit-with-the-stack)
8. [Alternatives Considered](#alternatives-considered)
9. [Risks](#risks)
10. [Revision History](#revision-history)

## Problem / Context

The [team registration](team-registration.md) feature requires the site's first
authenticated area: coaches log in to manage their Teams, organizers log in to
confirm registrations. This is a first-time auth build by a solo developer, so
the overriding goals are **minimal footgun surface** and **no vendor lock-in**
(the site is moving to a Danish host — see [Data Persistence](data-persistence.md)).

## Decision

Use **[Better Auth](https://www.better-auth.com/)** with its **passkey
(WebAuthn) plugin** as the *only* login mechanism, via the native Solid /
TanStack Start integration (`better-auth/tanstack-start/solid`). Better Auth
stores its user/session tables in **our own Postgres**, so identity is not tied
to any third-party auth vendor.

- **No passwords** — nothing to store, reset, or leak.
- **No email login links** — and in fact **no email sending at all** (see below).
- **Email is stored as contact info only**, and as the identifier a passkey is
  bound to.
- **Multiple passkeys per Account** are supported ("add this device") as the
  first line of recovery resilience.

## Why Passkeys-Only

- Coaches authenticate **rarely** (a few times per season), so passwords are
  mostly a liability (forgotten passwords, reset flows, secure storage).
- Passkeys are **phishing-resistant** and, on modern platforms, **sync across a
  user's devices** (iCloud Keychain / Google Password Manager), so a lost phone
  is usually not a lockout.
- It is the current best-practice direction for consumer auth and keeps the
  implementation surface small.

## No Email, By Design

The app sends **no email**. This removes an entire class of setup and operational
burden (transactional provider, SPF/DKIM/DNS, deliverability). It is possible
because:

- **Status** is a **pull** channel: coaches see Draft/Submitted/Confirmed/etc. on
  their dashboard. No notification push is required.
- **Organizer → coach contact**, when needed, is **manual** — organizers have the
  coach's email on file and use their own inbox.
- **Recovery** is manual (next section).

The recovery mechanism is designed generically so it *could* be auto-emailed
later with minimal change, without redesign.

## Account Recovery

Passkeys sync on most platforms, so true lockout is rare (ecosystem switches,
non-syncing devices). Two lines of defence:

1. **Self-service (primary):** enroll **multiple passkeys** before trouble
   ("add this laptop too").
2. **Break-glass (manual):** an **organizer generates a single-use, short-lived
   recovery link** from the admin view and delivers it to the coach **manually**
   (phone, or the organizer's own email). Opening it lets the coach **enroll a
   fresh passkey**. Every generation/use is **logged**.

No password fallback and no automated email are introduced. This is a deliberate
trade-off of a little manual effort for zero email infrastructure.

## Organizer Role & Bootstrapping

- Organizers use the **same passkey login** as coaches; their Account carries an
  **organizer role** that unlocks the admin view.
- The chicken-and-egg of "who grants the first organizer" is solved with an
  **env email allowlist**: when an Account signs up with an allowlisted email, it
  is auto-granted the organizer role. No seeded fake accounts, no separate
  password system.
- This is entirely separate from the **Sveltia CMS** at `/admin`, which keeps its
  own GitHub-based auth for content editing.

## Fit With the Stack

- The Better Auth handler mounts at a TanStack Start server route
  (`/api/auth/$`); the Solid client uses `createAuthClient` with the passkey (and
  magic-link-free) plugins.
- Authenticated routes are **dynamic** and must be **excluded from prerender**
  (see [Routing & Data Loading](routing-and-data-loading.md)).
- Auth tables live in the same Postgres as registration data (see
  [Data Persistence](data-persistence.md)), so there is one datastore to host and
  move.

## Alternatives Considered

**Email + password.** Familiar, but adds password storage/reset burden and is the
larger footgun for a first-time auth build.

**Magic-link (passwordless email).** Strong UX, but requires reliable email
infrastructure — explicitly rejected to avoid all email setup.

**Hosted identity provider (Clerk, WorkOS, Supabase Auth, etc.).** Fast DX but
introduces a third-party identity vendor and lock-in, which conflicts with the
data-sovereignty / self-host direction. Better Auth keeps identity in our own
Postgres.

**Passkeys with recovery codes shown at signup.** Viable, but users lose codes;
organizer-assisted recovery matches the "small, trusted community" reality and
needs no user diligence.

## Risks

- **Passkey UX on unusual devices/browsers.** Mitigated by multi-passkey
  enrolment and manual recovery.
- **Manual recovery does not scale** beyond a small community — acceptable at the
  expected scale (tens of teams), and upgradable to auto-email later.
- **Better Auth passkey/Solid integration maturity** should be validated with a
  spike before committing UI work.

## Revision History

- **2026-07-04** (Michael): Initial proposal for passkey-only auth via Better
  Auth, no-email operation, manual recovery, and env-allowlist organizer roles.
