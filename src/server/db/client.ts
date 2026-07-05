import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema'

/**
 * Driver-agnostic database handle. Production uses postgres.js; tests use an
 * in-process PGlite instance. Both are Drizzle `PgDatabase`s, so every data
 * accessor is written against this shared type and stays injectable.
 */
export type Database = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

let cached: Database | undefined

/**
 * The production database, connected lazily via `DATABASE_URL`. Kept lazy so
 * importing this module (e.g. from the auth config) never opens a connection
 * until a query actually runs — which also keeps the module import-safe in the
 * prerender/build step and in tests.
 */
export async function getDb(): Promise<Database> {
  if (!cached) {
    const [{ drizzle }, { default: postgres }, { env }] = await Promise.all([
      import('drizzle-orm/postgres-js'),
      import('postgres'),
      import('~/env'),
    ])
    cached = drizzle(postgres(env.DATABASE_URL), { schema })
  }
  return cached
}
