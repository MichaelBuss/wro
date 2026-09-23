import { describe, expect, it } from 'vitest'
import { applyMigrations, resolveDatabaseUrl } from './migrate.mjs'

describe('resolveDatabaseUrl', () => {
  it('returns a configured DATABASE_URL', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: 'postgres://wro:wro@localhost:5432/wro' })).toBe('postgres://wro:wro@localhost:5432/wro')
  })

  it('rejects a missing DATABASE_URL', () => {
    expect(() => resolveDatabaseUrl({})).toThrowError(/DATABASE_URL/)
  })

  it('rejects a blank DATABASE_URL', () => {
    expect(() => resolveDatabaseUrl({ DATABASE_URL: '   ' })).toThrowError(/DATABASE_URL/)
  })
})

describe('applyMigrations', () => {
  it('rejects before touching the database when DATABASE_URL is missing', async () => {
    await expect(applyMigrations({ databaseUrl: '' })).rejects.toThrowError(/DATABASE_URL/)
  })
})
