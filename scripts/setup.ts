/**
 * Local development setup script.
 *
 * Idempotent — safe to re-run at any time.
 *
 * Steps:
 *   1. Copy .env.example → .env if .env does not exist yet.
 *   2. Start the local Docker Postgres container (docker compose up -d).
 *   3. Wait for Postgres to report healthy.
 *   4. Run database migrations (drizzle-kit migrate).
 *
 * Run with: npm run setup
 */

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ENV_FILE = join(ROOT, '.env')
const ENV_EXAMPLE = join(ROOT, '.env.example')
const CONTAINER = 'wro-postgres'

// npm scripts run with a stripped PATH. Augment it with the locations where
// Docker Desktop and OrbStack install their CLIs on macOS.
const PATH = [
  `${process.env.HOME}/.orbstack/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  process.env.PATH,
]
  .filter(Boolean)
  .join(':')

// Parse .env into a plain object so child processes (drizzle-kit, etc.) get
// the same variables that Vite would load — without requiring dotenv as a dep.
function loadDotEnv(): Record<string, string | undefined> {
  if (!existsSync(ENV_FILE)) return {}
  return Object.fromEntries(
    readFileSync(ENV_FILE, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .flatMap((line) => {
        const eq = line.indexOf('=')
        if (eq === -1) return []
        const key = line.slice(0, eq).trim()
        const val = line
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
        return [[key, val]] as const
      }),
  )
}

const dotEnv = loadDotEnv()
const childEnv = { ...process.env, ...dotEnv, PATH }

function log(msg: string) {
  process.stdout.write(`\n  ${msg}\n`)
}

function step(label: string) {
  process.stdout.write(`\n\x1b[1m→ ${label}\x1b[0m\n`)
}

function ok(msg: string) {
  process.stdout.write(`  \x1b[32m✓\x1b[0m ${msg}\n`)
}

function warn(msg: string) {
  process.stdout.write(`  \x1b[33m!\x1b[0m ${msg}\n`)
}

function fail(msg: string): never {
  process.stdout.write(`\n  \x1b[31m✗\x1b[0m ${msg}\n\n`)
  process.exit(1)
}

function run(
  cmd: string,
  opts: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {},
) {
  return spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    stdio: 'pipe',
    env: childEnv,
    ...opts,
  })
}

// ── Step 1: .env ─────────────────────────────────────────────────────────────

step('Environment file')

if (existsSync(ENV_FILE)) {
  ok('.env already exists — skipping copy')
} else {
  copyFileSync(ENV_EXAMPLE, ENV_FILE)
  ok('Copied .env.example → .env')
}

// Always remind about ORGANIZER_EMAIL_ALLOWLIST — easy to miss whether .env
// was just created or already existed.
const hasOrganizerEmail =
  dotEnv.ORGANIZER_EMAIL_ALLOWLIST !== undefined &&
  dotEnv.ORGANIZER_EMAIL_ALLOWLIST !== 'you@example.com' &&
  dotEnv.ORGANIZER_EMAIL_ALLOWLIST !== ''

if (!hasOrganizerEmail) {
  warn(
    'ORGANIZER_EMAIL_ALLOWLIST is not set (or still has the placeholder value).',
  )
  warn(
    'Add your email to .env before signing up, or you will not get the organizer role:',
  )
  warn('  ORGANIZER_EMAIL_ALLOWLIST=your@email.com')
  log('')
}

// ── Step 2: Docker Compose ────────────────────────────────────────────────────

step('Starting Postgres (docker compose up -d)')

const dockerCheck = run('docker info')
if (dockerCheck.status !== 0) {
  const detail =
    dockerCheck.stderr.toString().trim() || dockerCheck.stdout.toString().trim()
  fail(
    `Could not reach the Docker daemon${detail ? `:\n\n    ${detail.split('\n').join('\n    ')}` : '.'}\n\n` +
      `  Make sure Docker Desktop or OrbStack is fully started, then re-run \`npm run setup\`.`,
  )
}

const up = run('docker compose up -d', { stdio: 'inherit' })
if (up.status !== 0) {
  fail('`docker compose up -d` failed. Check the output above.')
}

// ── Step 3: Wait for healthy ──────────────────────────────────────────────────

step(`Waiting for ${CONTAINER} to be healthy`)

const MAX_ATTEMPTS = 20
const INTERVAL_MS = 1500
let healthy = false

for (let i = 1; i <= MAX_ATTEMPTS; i++) {
  const result = run(
    `docker inspect --format='{{.State.Health.Status}}' ${CONTAINER}`,
  )
  const status = result.stdout.toString().trim().replace(/'/g, '')

  if (status === 'healthy') {
    healthy = true
    break
  }

  process.stdout.write(`  waiting… (${i}/${MAX_ATTEMPTS})\r`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, INTERVAL_MS)
}

if (!healthy) {
  fail(
    `${CONTAINER} did not become healthy after ${MAX_ATTEMPTS} attempts.\n` +
      `  Run \`docker compose logs db\` to see what went wrong.`,
  )
}

ok(`${CONTAINER} is healthy`)

// ── Step 4: Migrate ───────────────────────────────────────────────────────────

step('Running database migrations (drizzle-kit migrate)')

// OrbStack injects its own DATABASE_URL (no credentials, wrong db name) into
// the shell environment and sometimes into .env files. Catch this early.
const dbUrl = dotEnv.DATABASE_URL ?? process.env.DATABASE_URL ?? ''
if (!dbUrl || !dbUrl.includes('@')) {
  warn(`DATABASE_URL looks wrong: ${dbUrl || '(not set)'}`)
  warn('Expected format: postgres://user:password@host:port/dbname')
  fail(
    'OrbStack may have overwritten your .env with its proxy URL.\n' +
      '  Fix DATABASE_URL in .env (see .env.example) and re-run `npm run setup`.',
  )
}

// Capture drizzle-kit output rather than inheriting — its ANSI spinner erases
// its own error lines when writing directly to the terminal. Strip ANSI escape
// codes before printing so the line-erase sequences don't fire again.
//
// The ESC (0x1b) byte is built at runtime so the pattern's source carries no
// literal control character (which ESLint's no-control-regex forbids).
const ANSI_CSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g')
const stripAnsi = (s: string) =>
  s
    .replace(ANSI_CSI, '') // CSI sequences (colors, cursor, erase)
    .replace(/\r/g, '\n') // carriage returns → newlines

const migrateResult = run('./node_modules/.bin/drizzle-kit migrate')
const migrateOut = [
  migrateResult.stdout.toString(),
  migrateResult.stderr.toString(),
]
  .map((s) => stripAnsi(s).trim())
  .filter(Boolean)
  .join('\n')

if (migrateOut) process.stdout.write(migrateOut + '\n')

if (migrateResult.status !== 0) {
  fail('`drizzle-kit migrate` failed — see output above.')
}

ok('Migrations applied')

// ── Done ──────────────────────────────────────────────────────────────────────

process.stdout.write(`
\x1b[32m\x1b[1m  All done.\x1b[0m Run \x1b[1mnpm run dev\x1b[0m to start the app at http://localhost:3000

`)
