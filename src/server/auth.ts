import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start/solid'
import { z } from 'zod'
import { createAccount, getAccountByEmail } from './db/accounts'
import { getDb } from './db/client'
import * as schema from './db/schema'

/**
 * Context sent by the client when enrolling the first passkey for a brand-new
 * Account. Passkey-first onboarding means there is no session (and no password
 * or email step) yet, so the identity to bind the credential to travels here.
 */
const registrationContextSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
})

function buildAuth(
  db: Awaited<ReturnType<typeof getDb>>,
  env: {
    BETTER_AUTH_URL?: string
    BETTER_AUTH_SECRET?: string
    PASSKEY_RP_ID?: string
  },
) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    // No email is sent anywhere in this app (see authentication ADR); email is
    // stored as contact info + the identifier a passkey binds to.
    emailAndPassword: { enabled: false },
    plugins: [
      passkey({
        rpID: env.PASSKEY_RP_ID ?? 'localhost',
        rpName: 'WRO Denmark',
        origin: env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        registration: {
          // Passkey-first: a visitor enrolls a passkey with no prior session.
          requireSession: false,
          resolveUser: async ({ context }) => {
            const { email, name } = registrationContextSchema.parse(
              JSON.parse(context || '{}'),
            )
            const existing = await getAccountByEmail(db, email)
            return existing ?? (await createAccount(db, { email, name }))
          },
        },
      }),
      // Must stay last: wires cookie writes into TanStack Start's system.
      tanstackStartCookies(),
    ],
  })
}

type AuthInstance = ReturnType<typeof buildAuth>

let cached: AuthInstance | undefined

/**
 * Build (once) the Better Auth instance. Kept lazy so importing this module
 * never touches `DATABASE_URL` or opens a connection — the auth/dashboard
 * routes are excluded from prerender, and this must not run during the build.
 */
export async function getAuth(): Promise<AuthInstance> {
  if (cached) {
    return cached
  }

  const [db, { env }] = await Promise.all([getDb(), import('~/env')])
  cached = buildAuth(db, env)
  return cached
}
