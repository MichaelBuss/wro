/**
 * Local-parity smoke harness: the exact production artifact, asserted over
 * HTTP (issue #43; the committed proof behind the Hetzner migration in #19).
 *
 * Steps:
 *   1. Wipe any previous smoke stack (`docker compose down -v`).
 *   2. Build the app + authenticator images and boot the stack — the app
 *      container, a fresh Postgres, and the authenticator — waiting for
 *      health. The server exits non-zero if boot migrations fail, so a
 *      healthy app is proof the migration step completed.
 *   3. Run smoke checks that assert only external behavior: HTTP responses
 *      and boot outcomes (container state and boot stdout). Never internal
 *      module structure, build-output layout, or database internals.
 *   4. Restart the app container and re-check, proving a second boot against
 *      the migrated database is idempotent.
 *   5. Tear the stack down, database included — every run starts from scratch.
 *
 * Run with: npm run smoke
 */

import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const COMPOSE_FILE = resolve(ROOT, 'compose.smoke.yml')
const PROJECT = 'wro-smoke'
const APP_URL = 'http://localhost:4170'
const AUTHENTICATOR_URL = 'http://localhost:4180'

// The boot's migration step logs this once it has finished applying (or
// skipping) the committed Drizzle migrations (src/server/db/migrate.mjs) —
// once per boot, so counting occurrences across restarts proves each boot
// ran its migration pass to completion.
const MIGRATED_LOG_LINE = 'schema up to date'

// npm scripts run with a stripped PATH. Augment it with the locations where
// Docker Desktop and OrbStack install their CLIs on macOS (same as setup.ts).
const PATH = [
  `${process.env.HOME}/.orbstack/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  process.env.PATH,
]
  .filter(Boolean)
  .join(':')

const childEnv = { ...process.env, PATH }

const step = (label: string): void => {
  process.stdout.write(`\n\x1b[1m→ ${label}\x1b[0m\n`)
}

const ok = (msg: string): void => {
  process.stdout.write(`  \x1b[32m✓\x1b[0m ${msg}\n`)
}

const warn = (msg: string): void => {
  process.stdout.write(`  \x1b[33m!\x1b[0m ${msg}\n`)
}

const fail = (msg: string): never => {
  process.stdout.write(`\n  \x1b[31m✗\x1b[0m ${msg}\n\n`)
  process.exit(1)
}

const compose = (args: Array<string>): SpawnSyncReturns<string> => {
  const result = spawnSync(
    'docker',
    ['compose', '--project-name', PROJECT, '--file', COMPOSE_FILE, ...args],
    { cwd: ROOT, env: childEnv, encoding: 'utf8' },
  )
  if (result.error) {
    fail(
      `Could not run docker: ${result.error.message}\n\n` +
        `  Make sure Docker Desktop or OrbStack is fully started, then re-run \`npm run smoke\`.`,
    )
  }
  return result
}

const composeOrDie = (args: Array<string>): void => {
  const result = compose(args)
  if (result.status !== 0) {
    const detail = result.stderr.trim()
    fail(
      `\`docker compose ${args.join(' ')}\` failed${detail ? `:\n\n    ${detail.split('\n').join('\n    ')}` : '.'}`,
    )
  }
}

const get = async (url: string): Promise<Response> =>
  fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })

const waitUntilUp = async (label: string, url: string): Promise<void> => {
  const timeoutMs = 120_000
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      if (response.ok) return
    } catch {
      // Not accepting connections yet — keep polling until the deadline.
    }
    if (Date.now() > deadline) {
      fail(`${label} did not come up within ${timeoutMs / 1000}s`)
    }
    await sleep(1_000)
  }
}

const appLogs = (): string => {
  const result = compose(['logs', '--no-color', 'app'])
  if (result.status !== 0) {
    fail(`Could not read app container logs:\n\n    ${result.stderr.trim()}`)
  }
  return result.stdout
}

const countMigratedBoots = (logs: string): number =>
  logs.split(MIGRATED_LOG_LINE).length - 1

type CheckOutcome =
  | { name: string; passed: true }
  | { name: string; passed: false; error: string }

const runCheck = async (
  name: string,
  probe: () => void | Promise<void>,
): Promise<CheckOutcome> => {
  try {
    await probe()
    ok(name)
    return { name, passed: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    warn(`${name}`)
    return { name, passed: false, error: message }
  }
}

const checks: Array<[name: string, probe: () => void | Promise<void>]> = [
  [
    'prerendered page serves',
    async () => {
      const response = await get(`${APP_URL}/`)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type') ?? '', /text\/html/)
      assert.match(await response.text(), /<!DOCTYPE html/i)
    },
  ],
  [
    'dynamic route renders (/login — excluded from prerender, SSR at request time)',
    async () => {
      const response = await get(`${APP_URL}/login`)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type') ?? '', /text\/html/)
      await response.text()
    },
  ],
  [
    'server function responds (/api/auth/get-session)',
    async () => {
      const response = await get(`${APP_URL}/api/auth/get-session`)
      assert.equal(response.status, 200)
      assert.match(
        response.headers.get('content-type') ?? '',
        /application\/json/,
      )
      await response.text()
    },
  ],
  [
    'auth handler is mounted (/api/auth/ok)',
    async () => {
      const response = await get(`${APP_URL}/api/auth/ok`)
      assert.equal(response.status, 200)
      const parsed: unknown = JSON.parse(await response.text())
      assert.deepStrictEqual(parsed, { ok: true })
    },
  ],
  [
    '/cms serves the CMS SPA',
    async () => {
      const response = await get(`${APP_URL}/cms`)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type') ?? '', /text\/html/)
      assert.match((await response.text()).toLowerCase(), /sveltia/)
    },
  ],
  [
    '/admin 301s to /cms',
    async () => {
      const response = await get(`${APP_URL}/admin`)
      assert.equal(response.status, 301)
      assert.equal(response.headers.get('location'), '/cms')
    },
  ],
  [
    '/admin/* 301s to /cms/* (sub-path and query preserved)',
    async () => {
      const response = await get(`${APP_URL}/admin/config.yml?foo=bar`)
      assert.equal(response.status, 301)
      assert.equal(response.headers.get('location'), '/cms/config.yml?foo=bar')
    },
  ],
  [
    'fresh database is migrated on boot',
    () => {
      const boots = countMigratedBoots(appLogs())
      assert.equal(
        boots,
        1,
        `expected the first boot to log exactly one completed migration pass, found ${boots}`,
      )
    },
  ],
  [
    'second boot against the migrated database is idempotent',
    async () => {
      composeOrDie(['restart', 'app'])
      await waitUntilUp('app (second boot)', `${APP_URL}/`)
      const response = await get(`${APP_URL}/`)
      assert.equal(response.status, 200)
      await response.text()
      const boots = countMigratedBoots(appLogs())
      assert.equal(
        boots,
        2,
        `expected the second boot to complete its (skipping) migration pass too, found ${boots}`,
      )
    },
  ],
  [
    'authenticator rejects a credentialess token exchange (/callback)',
    async () => {
      const response = await get(`${AUTHENTICATOR_URL}/callback`)
      assert.equal(response.status, 400)
      assert.match(response.headers.get('content-type') ?? '', /text\/html/)
      await response.text()
    },
  ],
]

// ── Run ───────────────────────────────────────────────────────────────────────

step(`Wiping any previous smoke stack (${PROJECT})`)
composeOrDie(['down', '-v', '--remove-orphans'])

try {
  step(
    'Building images and booting the stack (app + fresh Postgres + authenticator)',
  )
  composeOrDie(['up', '-d', '--build', '--wait'])
  ok('stack is up and healthy')

  step('Smoke checks')
  const outcomes: Array<CheckOutcome> = []
  for (const [name, probe] of checks) {
    outcomes.push(await runCheck(name, probe))
  }

  const failed = outcomes.filter((outcome) => !outcome.passed)
  if (failed.length > 0) {
    step('Diagnostics (docker compose logs, last 60 lines per service)')
    const logs = compose(['logs', '--tail', '60'])
    if (logs.stdout.trim()) process.stdout.write(`${logs.stdout.trim()}\n`)

    fail(
      `${failed.length} of ${outcomes.length} smoke checks failed:\n\n` +
        failed
          .map((outcome) => `  - ${outcome.name}\n      ${outcome.error}`)
          .join('\n'),
    )
  }

  process.stdout.write(
    `\n\x1b[32m\x1b[1m  All ${outcomes.length} smoke checks passed.\x1b[0m\n`,
  )
} finally {
  step('Tearing down the smoke stack (database wiped)')
  composeOrDie(['down', '-v', '--remove-orphans'])
}
