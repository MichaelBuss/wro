import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from './client'
import * as schema from './schema'

/**
 * Spin up a fresh, isolated in-process Postgres (PGlite) with the committed
 * Drizzle migrations applied. Used as the injectable test database so specs run
 * against real SQL and the real schema — no Docker, no mocks.
 */
export async function createTestDb(): Promise<Database> {
  const client = new PGlite()
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  return db
}
