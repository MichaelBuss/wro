---
name: Data Persistence (Postgres + Drizzle)
status: proposed
authors:
  - Michael
created: 2026-07-04
updated: 2026-07-04
relatedPlans:
  - team-registration
  - authentication
  - cms-content-layer
  - build-and-deployment
overview: >
  A host-agnostic Postgres database accessed via Drizzle ORM for all dynamic,
  user-owned data (registrations + auth), kept strictly separate from the
  build-time Markdown content layer. Chosen for portability (no PaaS lock-in),
  EU data residency, and a local-first build order ahead of a move to cloudnet.dk.
---

# Data Persistence (Postgres + Drizzle)

> **Status**: Proposed (July 2026). Not yet implemented.

## Table of Contents

1. [Problem / Context](#problem--context)
2. [Decision](#decision)
3. [Why Portable Postgres](#why-portable-postgres)
4. [Two Distinct Data Planes](#two-distinct-data-planes)
5. [Data Residency & GDPR](#data-residency--gdpr)
6. [Backup & Recovery](#backup--recovery)
7. [Build Order & Migration Path](#build-order--migration-path)
8. [Fit With the Stack](#fit-with-the-stack)
9. [Alternatives Considered](#alternatives-considered)
10. [Revision History](#revision-history)

## Problem / Context

The [team registration](team-registration.md) and [authentication](authentication.md)
features need to persist live, user-owned, frequently-changing data — the first
such need on the site. The existing content layer stores editorial copy as
**build-time-inlined Markdown** (see [CMS Content Layer](cms-content-layer.md)),
which cannot model registrations (you can't rebuild the site per sign-up, and the
serverless function has no durable local disk).

Two hard constraints shape the choice:

- **No PaaS lock-in.** The site is planned to move off Netlify to a Danish host
  (**cloudnet.dk**) for data-sovereignty reasons. Adopting a proprietary store
  (e.g. Netlify Database, or a bundled auth+db platform) would work against that.
- **Data sovereignty / GDPR.** The data includes **minors' personal data**, which
  pushes toward EU data residency and portability.

## Decision

Store all dynamic data in **PostgreSQL**, accessed via **[Drizzle ORM](https://orm.drizzle.team/)**,
connected through a single standard **`DATABASE_URL`** environment variable.
Migrations are **committed to the repo** (Drizzle Kit).

This is the boring, portable, type-safe TypeScript stack: plain Postgres over a
connection string runs on a Netlify Function today and on a Node server at
cloudnet.dk tomorrow with **zero application-code changes**. Auth tables
(Better Auth) live in the **same** database, so there is exactly one datastore to
host, back up, and eventually relocate.

## Why Portable Postgres

- **Standard & ubiquitous** — runs anywhere, well-understood, easy to hire/learn
  for, huge tooling ecosystem.
- **Relational fit** — the domain (Account ↔ Team ↔ Event/Category/Participant) is
  inherently relational; a real schema with foreign keys beats hand-rolled joins
  over a key-value store.
- **Drizzle** gives end-to-end TypeScript types from schema to query with a thin,
  SQL-close API and first-class migrations — the current idiomatic TS choice.
- **No lock-in** — "it's just Postgres + a connection string" is the entire
  portability guarantee.

## Two Distinct Data Planes

The site now has two intentionally separate data models:

| Plane | Store | Editable by | Changes via |
| --- | --- | --- | --- |
| **Content** (copy, gallery, blog) | Markdown in Git, inlined at build | Editors (Sveltia CMS) | Commit + rebuild |
| **Registrations + Auth** | Postgres | Coaches + Organizers | Live writes |

These do not mix. The content pipeline is unchanged; Postgres is additive.

## Data Residency & GDPR

- Target **EU data residency** for the Postgres instance.
- **Data minimisation** is applied in the schema (birth *year* not birthdate;
  optional Organization; email as contact-only).
- **Export and erasure** are product features (see
  [Team Registration → Data Rights](team-registration.md#data-rights-gdpr)); the
  relational model makes "everything belonging to this Account" a clean,
  cascade-friendly query.

## Backup & Recovery

Backups matter here because the database holds registrations **and minors' PII**.
The strategy is phased.

**Local-first build (now):** no backups needed. The schema lives in **committed
Drizzle migrations** (the effective schema backup) and local rows are disposable
seed/test data.

**Production (after the cloudnet.dk move):** the concrete mechanism depends on
what the host provides.

- **If cloudnet.dk offers managed Postgres:** rely on its **automated backups +
  point-in-time recovery**, but verify retention and that we can actually trigger
  a restore ourselves.
- **If we self-host Postgres there:** we own backups. Baseline for this small,
  low-churn dataset:
  - **Automated daily `pg_dump`** to **encrypted, off-box storage in the EU**
    (never only on the DB host).
  - **~30-day rolling retention.**
  - **Periodic test-restores** into a scratch database — an untested backup is not
    a backup.
  - **WAL archiving / PITR** only if a ~24h loss window ever becomes unacceptable;
    daily dumps are expected to suffice.

**Targets (owner's decision, revisit as stakes change):** **RPO ≈ 24h, RTO ≈ a
few hours.** Registration-deadline week may warrant temporarily tighter RPO.

**GDPR interaction with backups:** backups contain PII, so they are **encrypted,
access-controlled, and retention-limited**, and belong in the data-retention
note. Erasure (see [Team Registration → Data Rights](team-registration.md#data-rights-gdpr))
removes data from the **live** database but **not** from historical backups;
backups age out on the retention schedule and are **not** mined to re-inject
erased individuals except in a genuine disaster restore. This is a deliberate,
standard trade-off, stated so it is a decision rather than an accident.

Implementation is tracked in issue
[`docs/issues/010-production-backups-and-restore-drill.md`](../issues/010-production-backups-and-restore-drill.md),
deferred until the cloudnet.dk hosting shape is known.

## Build Order & Migration Path

The registration feature is **not yet live** and will go live only **after** the
cloudnet.dk move. Therefore:

1. **Build now against a local Postgres** (a Docker container), with Drizzle
   migrations committed to Git and all access behind `DATABASE_URL`.
2. **No interim cloud database** is provisioned — that decision is skipped
   entirely, and the Netlify-serverless connection-pooling concern is avoided
   because the real target is a persistent Node server.
3. **At migration:** provision Postgres on/near cloudnet.dk (EU), run the
   committed migrations, set `DATABASE_URL`, deploy. Relocating an existing
   Postgres elsewhere is `pg_dump | pg_restore` + one env var.

## Fit With the Stack

- Reads/writes go through **`createServerFn`** handlers from route loaders/actions
  — the same seam used for content, pointed at Postgres (see
  [Routing & Data Loading](routing-and-data-loading.md)).
- Authenticated/dynamic routes are **excluded from prerender**.
- The DB driver choice (e.g. `postgres.js`) is wrapped by Drizzle, so the
  connection strategy can be tuned per host without touching query code.

## Alternatives Considered

**Netlify Database (Neon-powered).** The glove-fit for a Netlify-hosted app
(auto-provisioning, Git-tracked migrations, per-preview DB branches) — but it is a
Netlify-plan-bound, proprietary integration, directly at odds with the planned
move to cloudnet.dk. Rejected for lock-in.

**Supabase.** Postgres plus bundled auth + storage. Its auth is redundant here
(passkeys via Better Auth) and it adds another platform dependency. If ever
needed, it's still "just Postgres" and reachable via `DATABASE_URL`.

**Netlify Blobs / key-value store.** Zero-config and fine for tiny blobs, but
modelling relational registration data (accounts, teams, participants, events) in
KV is awkward and error-prone. Rejected for the relational mismatch.

**SQLite / Turso (libSQL).** Cheap and capable, but Postgres is the more standard
target for a future self-hosted Node server and has the richer ecosystem.

**Keep everything in Git/Markdown.** Impossible for live user data — a rebuild per
sign-up is a non-starter, and the serverless function has no durable disk.

## Revision History

- **2026-07-04** (Michael): Initial proposal for host-agnostic Postgres + Drizzle,
  separate from the content layer, with a local-first build order and a
  cloudnet.dk migration path.
- **2026-07-04** (Michael): Added Backup & Recovery section (phased strategy,
  RPO/RTO targets, GDPR/backup interaction); tracked in issue 010.
