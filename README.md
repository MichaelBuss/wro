# WRO Denmark

Website for WRO Denmark — team registrations, competition management, and public content.

Built with Solid.js, TanStack Start, Tailwind CSS v4, Better Auth (passkeys), Drizzle ORM, and Postgres.

## Prerequisites

- **Node.js** (see `.nvmrc` or `engines` in `package.json`)
- **Docker** (for local Postgres)

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env
```

Open `.env` and set `ORGANIZER_EMAIL_ALLOWLIST` to your email address **before** you
sign up — this is how you get the organizer role (see [Bootstrapping an organizer](#bootstrapping-an-organizer)).

```bash
# 3. Start local Postgres
docker compose up -d

# 4. Run database migrations
npm run db:migrate

# 5. Start the dev server
npm run dev
```

The app runs at <http://localhost:3000>.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes (prod) | Secret used by Better Auth to sign sessions. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | No | Public origin the app runs on (default: `http://localhost:3000`) |
| `PASSKEY_RP_ID` | No | WebAuthn relying-party id — host only, no protocol or port (default: `localhost`) |
| `ORGANIZER_EMAIL_ALLOWLIST` | No | Comma-separated emails auto-granted the organizer role on first signup |

## Bootstrapping an Organizer

The first organizer account is bootstrapped via `ORGANIZER_EMAIL_ALLOWLIST`. When an
account signs up with an allowlisted email, it is automatically granted the organizer role.

**Before you sign up**, add your email to `.env`:

```
ORGANIZER_EMAIL_ALLOWLIST=you@example.com
```

Then sign up at `/signup` using that email. If you already have an account and need to
grant it the organizer role retroactively, update the database directly:

```sql
UPDATE "user" SET role = 'organizer' WHERE email = 'you@example.com';
```

See [`docs/architecture/authentication.md`](docs/architecture/authentication.md) for the full
rationale behind the passkey-only auth and env-allowlist approach.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run typecheck` | Type-check with tsgo |
| `npm run lint` | ESLint + content validation |
| `npm run format` | Prettier |
| `npm test` | Run Vitest test suite |
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run images:optimize` | Optimise images to WebP for `public/uploads/` |

## Architecture

The `docs/architecture/` directory has decision records for each major design area:

- [`authentication.md`](docs/architecture/authentication.md) — passkeys-only via Better Auth, organizer bootstrapping
- [`data-persistence.md`](docs/architecture/data-persistence.md) — Postgres + Drizzle, local-first build order
- [`team-registration.md`](docs/architecture/team-registration.md) — domain model, registration lifecycle, GDPR
- [`routing-and-data-loading.md`](docs/architecture/routing-and-data-loading.md) — TanStack Router, SSR, prerender exclusions
- [`tech-stack-and-framework.md`](docs/architecture/tech-stack-and-framework.md) — why Solid.js / TanStack Start
- [`styling-and-theming.md`](docs/architecture/styling-and-theming.md) — Tailwind v4, CVA, Kobalte
- [`cms-content-layer.md`](docs/architecture/cms-content-layer.md) — Markdown + Sveltia CMS at `/admin`
- [`image-pipeline.md`](docs/architecture/image-pipeline.md) — WebP optimisation, single source of truth
- [`component-and-ui-system.md`](docs/architecture/component-and-ui-system.md) — component conventions
- [`build-and-deployment.md`](docs/architecture/build-and-deployment.md) — Netlify, environment setup
- [`developer-experience-and-tooling.md`](docs/architecture/developer-experience-and-tooling.md) — tooling choices

The canonical domain vocabulary (Account, Team, Event, Category, etc.) is in [`CONTEXT.md`](CONTEXT.md).
