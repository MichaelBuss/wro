---
name: Build & Deployment
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-09-23
codeAnchors:
  - vite.config.ts
  - Dockerfile
  - src/server/production-server.mjs
  - compose.smoke.yml
  - scripts/smoke.ts
relatedPlans:
  - tech-stack-and-framework
  - routing-and-data-loading
overview: >
  Vite 7 + TanStack Start built into a self-contained Node server image: a
  static client (prerendered HTML included) plus a fetch-style SSR handler
  served from one node:http process, with the committed Drizzle migrations
  applied idempotently on container boot. Deployed by Coolify on the Hetzner
  VPS per ADR 0001 — no deploy-target plugin, no platform adapter, no CI in
  the deploy path.
---

# Build & Deployment

> **Status**: Implemented (February 2026; self-contained Node server pipeline since September 2026).

## Context

TanStack Start uses Vite as its build tool. The pipeline produces prerendered HTML for the mostly-static content pages while keeping a server runtime available for server functions and dynamic rendering. Per [ADR 0001](../adr/0001-hetzner-vps-coolify.md) the artifact is a self-contained Node server Docker image, built by Coolify on a single Hetzner VPS and deployed by pushing to `main`. The repo contains no deploy-target plugin and no platform-specific configuration. (The live-site cutover itself — provisioning the VPS, DNS, TLS, secrets — is GitHub issue #38; the repo-side pipeline described here is complete.)

## Decision

**No deploy-target plugin** — a plain `vite build` emits a static client into `dist/client/` (including prerendered HTML) plus a fetch-style SSR handler (default export `{ fetch }`) into `dist/server/server.js`. [`src/server/production-server.mjs`](../../src/server/production-server.mjs) serves both from a single `node:http` process:

1. GET/HEAD requests matching a file in `dist/client` are served statically — ETags, gzip for compressible responses above 1 KB, immutable caching for content-hashed `/assets/`.
2. Legacy `/admin` and `/admin/*` paths answer a 301 redirect to their `/cms` equivalents, query string included.
3. Everything else — dynamic routes, server functions (`/_serverFn/*`), the passkey auth handler (`/api/auth/*`) — is forwarded to the SSR handler as a standard `Request` (origin reconstructed from `x-forwarded-proto` behind the reverse proxy), and its `Response` is written back.

**Prerendering as the primary strategy** — with `crawlLinks: true`, the build generates static HTML at build time for all discoverable routes; these serve directly from the app's own Node process. `concurrency: 1` keeps the prerender crawl deterministic. The filter excludes routes that must render dynamically rather than be prerendered: `/cms` (a static Sveltia SPA, not a TanStack route), `/api` (the Better Auth handler), and the authenticated/gated prefixes `/dashboard`, `/login`, `/organizer`, `/recover`.

**Docker image** — the [`Dockerfile`](../../Dockerfile) packages the server on a pinned `node:24.16.0-alpine3.22` base, installs dependencies from the committed `package-lock.json` via `npm ci` (no floating tags, ever — see Alternatives), and ships `dist/`, the committed `drizzle/` migrations, and `src/server/`, running as the non-root `node` user. The container is configured entirely by environment variables (below); nothing is baked in.

**Migrations on boot** — before listening, the server applies the committed Drizzle migrations to `DATABASE_URL` (`src/server/db/migrate.mjs`), idempotently: re-running against an already-migrated database is a no-op, so container restarts and crash loops never fail or re-apply anything. A failed migration exits non-zero, so the container fails loudly instead of serving against an unmigrated database. Starting the process is the only migration step in the deploy lifecycle; Drizzle Kit remains a dev-time tool (`npm run db:generate`).

**Content inlined at build time** — markdown under `content/` is bundled into the build via Vite's `import.meta.glob` (`src/server/content.ts`), so content loading is identical in dev and production and needs no server-runtime storage layer. See [CMS Content Layer](cms-content-layer.md).

## Environment Variables

Everything a provisioner needs to set per container. App-level variables are validated by `src/env.ts`.

**App container** (the site image):

| Variable                    | Required                  | Meaning                                                                                                                                           |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | yes                       | Postgres connection string — migrated at boot, queried at runtime. The only database configuration there is.                                      |
| `PORT`                      | no (default `3000`)       | Listen port (what Coolify's reverse proxy points at).                                                                                             |
| `HOST`                      | no (default `0.0.0.0`)    | Listen address.                                                                                                                                   |
| `BETTER_AUTH_SECRET`        | yes in production         | Secret Better Auth signs sessions with.                                                                                                           |
| `BETTER_AUTH_URL`           | recommended               | Public origin Better Auth runs on, e.g. `https://beta.wro-denmark.dk`.                                                                            |
| `PASSKEY_RP_ID`             | before registration opens | WebAuthn relying-party ID (host without protocol/port). Origin-bound — see the hostname caveat in [ADR 0001](../adr/0001-hetzner-vps-coolify.md). |
| `ORGANIZER_EMAIL_ALLOWLIST` | no                        | Comma-separated emails auto-granted the organizer role on first signup (see [Authentication](authentication.md)).                                 |

**Sveltia Authenticator container** (the CMS's GitHub OAuth token-exchange gateway, [`sveltia-authenticator/`](../../sveltia-authenticator) — required for CMS login):

| Variable               | Required                          | Meaning                                                                                          |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GITHUB_CLIENT_ID`     | yes                               | Client ID of the GitHub OAuth App the CMS signs in with.                                         |
| `GITHUB_CLIENT_SECRET` | yes                               | That OAuth App's client secret — provision as a Coolify secret, never commit it.                 |
| `ALLOWED_DOMAINS`      | recommended                       | Comma-separated hostnames allowed to receive the token (e.g. `wro-denmark.dk,*.wro-denmark.dk`). |
| `GITHUB_ORIGIN`        | no (default `https://github.com`) | Override only for GitHub Enterprise testing.                                                     |
| `PORT` / `HOST`        | no (`8080` / `0.0.0.0`)           | Listen port / address.                                                                           |

The CMS popup targets the gateway via `base_url` in `public/cms/config.yml`, and the GitHub OAuth App's callback URL must be `{base_url}/callback` — the full setup walkthrough lives in [`sveltia-authenticator/README.md`](../../sveltia-authenticator/README.md).

## Deploy Flow

Deploy is one `git push` to `main`, whether the change is code or CMS content (CMS edits are commits to `main`):

1. Coolify builds the repo's `Dockerfile` on the VPS.
2. The container starts against the Coolify-managed Postgres and applies any pending migrations.
3. The same process serves prerendered pages, dynamic routes, server functions, and the auth handler.

No CI sits in the deploy path (a deliberate choice per [ADR 0001](../adr/0001-hetzner-vps-coolify.md)).

## Local Development & Parity

- `npm run dev` — the Vite dev server for day-to-day work (dev Postgres via `docker-compose.yml`).
- `npm run build && npm start` — build and run the standalone Node server locally, no Docker involved; same entry the image runs.
- `npm run smoke` — the full containerized parity harness below.

## Local Parity Harness

> **Added 2026-09** as part of the Hetzner/Coolify migration (see [ADR 0001](../adr/0001-hetzner-vps-coolify.md) and GitHub issue #19).

`npm run smoke` stands up the exact production artifact locally and asserts the site's external behavior end to end:

- [`compose.smoke.yml`](../../compose.smoke.yml) — an isolated compose project (never touches the dev stack in `docker-compose.yml`) with three services: the app image built from the repo `Dockerfile`, a throwaway Postgres, and the Sveltia authenticator. Ports (4170/4180) are deliberately off the development beats so the harness can run next to a dev server. `down -v` wipes the smoke database, so every run exercises a from-scratch migration on boot.
- [`scripts/smoke.ts`](../../scripts/smoke.ts) — builds both images, boots the stack, and asserts HTTP responses and boot outcomes only: a prerendered page serves, a dynamic route renders, a server function responds, the auth handler is mounted, `/cms` serves the CMS SPA, `/admin` and `/admin/*` 301 to their `/cms` equivalents, a fresh database is migrated on boot, a second boot against the migrated database is idempotent, and the authenticator rejects a credentialess token exchange cleanly. No assertions on internals.

Run it before shipping: it is the local template for what Coolify does on the VPS (build the image, run the container against a fresh Postgres, migrations applied on boot).

## Alternatives Considered

**Generic Nitro adapter (`nitro/vite`)** — the original approach (February–June 2026). Two problems made it a poor fit: TanStack Start's prerender-against-Nitro was unreliable (preview-server race conditions), so prerendering had to be disabled; and TanStack's documented workaround pinned `nitro` to a floating `nitro-nightly@latest`, which drifted between installs and broke the build.

**Netlify adapter (`@netlify/vite-plugin-tanstack-start`)** — the interim approach (June–September 2026): the officially supported path at the time; it removed the Nitro dependency and restored working prerendering, but shaped the artifact for a single PaaS. Dropped when the hosting decision landed on the self-hosted Hetzner VPS ([ADR 0001](../adr/0001-hetzner-vps-coolify.md)) so the deploy path contains no platform-specific packages, config files, or scripts — and so one `vite build` output works everywhere, from the smoke harness to the VPS.

## Consequences

- The deploy path is three pinned, released pieces — the committed Dockerfile, the committed lockfile, the committed migrations — with no floating nightlies to drift and break installs.
- Prerendered pages serve instantly from the app's own Node process; the same single process handles dynamic routes, server functions, and the auth handler. No function-splitting, no extra runtime.
- Adding a new static page just requires creating a route — `crawlLinks` discovers it automatically.
- A deploy never requires a manual migration step — and never suffers a forgotten one; booting against an already-migrated database is a no-op.
- Production parity is available locally at two levels: `npm run build && npm start` (same server entry, no Docker) and the full containerized harness (`npm run smoke`).

## Revision History

- **2026-02-16** (Michael): Initial document capturing build and deployment architecture (Vite + TanStack Start + Nitro nightly, Netlify preset).
- **2026-06-27** (Michael): Migrated deployment from the generic Nitro adapter to the official `@netlify/vite-plugin-tanstack-start`. Removed the `nitro` dependency and `nitro.config.ts`, changed the publish dir to `dist/client`, removed the stale `npm start` script, and re-enabled static prerendering (now working). Motivation: the floating `nitro-nightly@latest` pin drifted and broke the build, and the Netlify adapter is the supported path.
- **2026-09-16** (Michael): Decision to leave Netlify for a self-hosted Hetzner VPS managed by Coolify ([ADR 0001](../adr/0001-hetzner-vps-coolify.md)). The pipeline below still describes the live setup until that migration completes (repo prep in GitHub issue #19).
- **2026-09-23** (Michael): Added the local-parity harness (`npm run smoke`): containerized app + fresh Postgres + authenticator with HTTP-only smoke checks (GitHub issue #43). Corrected the stale claim that `npm start` was removed — the standalone Node server entry was restored when the Netlify adapter was dropped.
- **2026-09-23** (Michael): Rewritten around the implemented Hetzner/Coolify pipeline (GitHub issue #44): no deploy-target plugin, self-contained Node server image ([Dockerfile](../../Dockerfile)), idempotent boot-time Drizzle migrations, in-app `/admin` → `/cms` redirects, and the environment variables both containers need at provision time. The Netlify adapter moved from Decision to Alternatives Considered (history); the live-site cutover itself remains GitHub issue #38.
