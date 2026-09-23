export declare function resolveDatabaseUrl(env: { DATABASE_URL?: string | undefined }): string

export declare function applyMigrations(options?: {
  databaseUrl?: string | undefined
  migrationsFolder?: string
  log?: Pick<Console, 'info'>
}): Promise<void>
