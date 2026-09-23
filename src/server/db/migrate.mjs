/**
 * Applies the committed Drizzle migrations against `DATABASE_URL`.
 *
 * Invoked by the production server's boot path (see
 * src/server/production-server.mjs), so starting the container is the only
 * migration step in the deploy lifecycle. Drizzle records applied migrations
 * in its own table and skips them on later runs, making repeated boots
 * against the same database a no-op.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_FOLDER = resolve(MODULE_DIR, '../../../drizzle')

/**
 * The `DATABASE_URL` to migrate against. Throwing here (instead of letting
 * the driver fail lazily on first query) makes a misconfigured container exit
 * immediately with an actionable message.
 */
export function resolveDatabaseUrl(env = process.env) {
  const url = env.DATABASE_URL
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error('[migrate] DATABASE_URL is not set — pass the Postgres connection string as an environment variable.')
  }
  return url
}

/**
 * Apply the committed migrations in `migrationsFolder` to the Postgres database
 * at `databaseUrl`. Uses one short-lived connection and returns once the
 * schema is up to date — safe to run on every boot.
 */
export async function applyMigrations({ databaseUrl = process.env.DATABASE_URL, migrationsFolder = MIGRATIONS_FOLDER, log = console } = {}) {
  const url = resolveDatabaseUrl({ DATABASE_URL: databaseUrl })

  const [{ default: postgres }, { drizzle }, { migrate }] = await Promise.all([
    import('postgres'),
    import('drizzle-orm/postgres-js'),
    import('drizzle-orm/postgres-js/migrator'),
  ])

  const client = postgres(url, { max: 1, connect_timeout: 10 })
  try {
    await migrate(drizzle(client), { migrationsFolder })
    log.info(`[migrate] schema up to date (${migrationsFolder})`)
  } finally {
    await client.end({ timeout: 5 })
  }
}
