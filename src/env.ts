import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.url().optional(),
    /** Postgres connection string for all dynamic data (registrations + auth). */
    DATABASE_URL: z.string().min(1),
    /** Secret used by Better Auth to sign sessions. Required in production. */
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
    /** Public origin Better Auth runs on, e.g. http://localhost:3000. */
    BETTER_AUTH_URL: z.url().optional(),
    /** WebAuthn relying-party id (host without protocol/port). */
    PASSKEY_RP_ID: z.string().min(1).optional(),
    /**
     * Comma-separated list of email addresses that are auto-granted the
     * organizer role on first signup. E.g. "admin@wro.dk,org@wro.dk".
     * See docs/architecture/authentication.md (Organizer Role section).
     */
    ORGANIZER_EMAIL_ALLOWLIST: z.string().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  /**
   * What object holds the environment variables at runtime. Client (`VITE_`)
   * vars are statically inlined from `import.meta.env`; server-only secrets are
   * read from `process.env`, since Vite does not expose unprefixed vars to the
   * client bundle. This module is only ever imported server-side.
   */
  runtimeEnv: {
    ...import.meta.env,
    SERVER_URL: process.env.SERVER_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    PASSKEY_RP_ID: process.env.PASSKEY_RP_ID,
    ORGANIZER_EMAIL_ALLOWLIST: process.env.ORGANIZER_EMAIL_ALLOWLIST,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})
