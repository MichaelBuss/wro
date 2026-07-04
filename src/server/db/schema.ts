import { relations } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Event & Category schema. An Event scopes Team registrations; Categories are
// configured per Event (name + age band). See docs/architecture/team-registration.md.
// ---------------------------------------------------------------------------

export const eventKinds = ['competition', 'gathering'] as const
export type EventKind = (typeof eventKinds)[number]

export const event = pgTable('event', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').$type<EventKind>().notNull(),
  // Null means registration is open indefinitely.
  registrationDeadline: timestamp('registration_deadline'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const category = pgTable('category', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => event.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Eligibility band expressed as birth years: a Participant born in year Y is
  // in-band if minBirthYear <= Y <= maxBirthYear. Null means no bound.
  minBirthYear: integer('min_birth_year'),
  maxBirthYear: integer('max_birth_year'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Better Auth core schema (user / session / account / verification).
//
// Column keys MUST match Better Auth's field names (camelCase) because the
// Drizzle adapter maps model fields to Drizzle columns by these object keys.
// An Account (in our domain, a coach/organizer) is the `user` row; passkeys and
// sessions hang off it. See docs/architecture/authentication.md.
// ---------------------------------------------------------------------------

export const userRoles = ['coach', 'organizer'] as const
export type UserRole = (typeof userRoles)[number]

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // Organizer role is bootstrapped via env email allowlist (see authentication ADR).
  role: text('role').$type<UserRole>().notNull().default('coach'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Passkey plugin schema. A passkey is a WebAuthn credential bound to a user.
// Multiple passkeys per Account are supported ("add this device").
// ---------------------------------------------------------------------------

export const passkey = pgTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type').notNull(),
  backedUp: boolean('backed_up').notNull(),
  transports: text('transports'),
  createdAt: timestamp('created_at').defaultNow(),
  aaguid: text('aaguid'),
})

// ---------------------------------------------------------------------------
// Team registration schema. A Team is owned via a membership relationship so
// one Account can manage multiple Teams and a second coach can be added later
// (invite flow) with no migration. See docs/architecture/team-registration.md.
// ---------------------------------------------------------------------------

export const registrationStatuses = [
  'draft',
  'submitted',
  'confirmed',
  'waitlisted',
  'withdrawn',
] as const
export type RegistrationStatus = (typeof registrationStatuses)[number]

export const paymentStatuses = ['unpaid', 'paid', 'waived'] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const team = pgTable('team', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').$type<RegistrationStatus>().notNull().default('draft'),
  // Payment flag is set by organizers independently of Registration Status.
  paymentStatus: text('payment_status')
    .$type<PaymentStatus>()
    .notNull()
    .default('unpaid'),
  // Detail fields — all nullable because teams start as name-only drafts.
  categoryId: text('category_id').references(() => category.id, {
    onDelete: 'set null',
  }),
  responsibleAdultName: text('responsible_adult_name'),
  responsibleAdultPhone: text('responsible_adult_phone'),
  responsibleAdultEmail: text('responsible_adult_email'),
  organization: text('organization'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const participant = pgTable('participant', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => team.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  birthYear: integer('birth_year').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const teamMembership = pgTable('team_membership', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => team.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Recovery links — break-glass single-use tokens generated by an organizer
// to let a locked-out coach enroll a fresh passkey. Each row is also an
// audit-log entry: generation is recorded at createdAt, use at usedAt.
// See docs/architecture/authentication.md (Account Recovery).
// ---------------------------------------------------------------------------

export const recoveryLink = pgTable('recovery_link', {
  id: text('id').primaryKey(),
  // Cryptographically random token included in the recovery URL.
  token: text('token').notNull().unique(),
  // The coach who will use this link to regain access.
  targetUserId: text('target_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // The organizer who generated this link (audit trail).
  generatedByUserId: text('generated_by_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Set when the link is consumed; null means unused.
  usedAt: timestamp('used_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type RecoveryLinkRow = typeof recoveryLink.$inferSelect

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
  memberships: many(teamMembership),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, { fields: [passkey.userId], references: [user.id] }),
}))

export const eventRelations = relations(event, ({ many }) => ({
  categories: many(category),
}))

export const categoryRelations = relations(category, ({ one, many }) => ({
  event: one(event, { fields: [category.eventId], references: [event.id] }),
  teams: many(team),
}))

export const teamRelations = relations(team, ({ many, one }) => ({
  memberships: many(teamMembership),
  participants: many(participant),
  category: one(category, {
    fields: [team.categoryId],
    references: [category.id],
  }),
}))

export const teamMembershipRelations = relations(teamMembership, ({ one }) => ({
  team: one(team, {
    fields: [teamMembership.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMembership.userId],
    references: [user.id],
  }),
}))

export const participantRelations = relations(participant, ({ one }) => ({
  team: one(team, { fields: [participant.teamId], references: [team.id] }),
}))

export type UserRow = typeof user.$inferSelect
export type NewUserRow = typeof user.$inferInsert
export type SessionRow = typeof session.$inferSelect
export type PasskeyRow = typeof passkey.$inferSelect
export type TeamRow = typeof team.$inferSelect
export type NewTeamRow = typeof team.$inferInsert
export type TeamMembershipRow = typeof teamMembership.$inferSelect
export type EventRow = typeof event.$inferSelect
export type NewEventRow = typeof event.$inferInsert
export type CategoryRow = typeof category.$inferSelect
export type NewCategoryRow = typeof category.$inferInsert
export type ParticipantRow = typeof participant.$inferSelect
export type NewParticipantRow = typeof participant.$inferInsert
