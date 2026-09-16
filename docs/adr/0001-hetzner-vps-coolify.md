# Host on a single Hetzner VPS managed by Coolify

**Status:** accepted (2026-09-16). Supersedes the earlier direction to move to
cloudnet.dk recorded in the architecture docs.

The site must leave Netlify before the registration feature goes live: EU data
residency for minors' personal data and no PaaS lock-in (see
[Data Persistence](../architecture/data-persistence.md)). The original target
host (cloudnet.dk) turned out not to offer what we needed, so we chose a single
Hetzner VPS (CX22, Falkenstein/Nuremberg — EU residency is sufficient) running
everything on one box: the Coolify control panel, the app container, and a
Coolify-managed Postgres. Deploys are push-to-`main`: Coolify builds the repo's
Dockerfile on the VPS. Backups are Coolify's daily `pg_dump` to Hetzner Object
Storage (S3-compatible, EU), encrypted, ~30-day retention. The Sveltia CMS's
GitHub OAuth token-exchange gateway (Sveltia Authenticator) is self-hosted on
the same VPS rather than on Cloudflare Workers.

## Considered options

- **cloudnet.dk** — the previously documented target; rejected: could not
  provide what we needed.
- **Hetzner managed Postgres** — better backup/failover story, but separate
  billing at ~3–4× the cost, overkill for a few hundred registrations/season.
- **Cloudflare Workers for the CMS authenticator** — free and simple, but adds
  a second platform; self-hosting keeps the whole stack on our own EU
  infrastructure.
- **Staying on Netlify** — rejected: US PaaS lock-in in conflict with the
  data-sovereignty goal.

## Consequences

- One box is a single point of failure. Accepted because backups are real:
  daily, off-box, encrypted, and verified by a restore drill (tracked in a
  follow-up issue linked from #19).
- Content edits via the CMS are commits to `main`, so they rebuild and deploy
  exactly like code changes — same model as Netlify gave us.
- Passkeys are cryptographically bound to the origin hostname. The final
  production hostname must be chosen **before** registration opens (today the
  site lives on `beta.wro-denmark.dk`); promoting to another hostname later
  would invalidate every enrolled passkey. If a hostname change ever becomes
  necessary under live users, WebAuthn **Related Origin Requests**
  (`/.well-known/webauthn`) is the sanctioned escape hatch — it lets a new
  origin use passkeys whose RP ID is the old hostname, but the old name sticks
  around in passkey managers.
- GitHub Actions CI is expected to arrive later (lint/test gating on PRs);
  the deploy path deliberately does not depend on it.
