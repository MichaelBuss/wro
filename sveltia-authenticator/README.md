# Sveltia Authenticator

Standalone GitHub OAuth token-exchange gateway for the Sveltia CMS, self-hosted
on the Hetzner VPS instead of Cloudflare Workers (see
[ADR 0001](../docs/adr/0001-hetzner-vps-coolify.md)). A faithful port of
[sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) to a
zero-dependency Node server.

## How it works

The CMS (`/cms`) opens a popup to `{base_url}/auth?provider=github&site_id=…`
(`base_url` in `public/cms/config.yml`). The gateway redirects to GitHub's
authorize URL with a CSRF state cookie; GitHub calls back at `/callback`; the
gateway exchanges `code + client_id + client_secret` for an access token and
hands it to the CMS popup via `postMessage`. `/oauth/authorize` and
`/oauth/redirect` are served as aliases, matching the upstream worker.

## Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | yes | Client ID of the GitHub OAuth App used by the CMS ("Sign in with GitHub"). |
| `GITHUB_CLIENT_SECRET` | yes | Client secret of that OAuth App. Provision as a Coolify secret — never commit it. |
| `ALLOWED_DOMAINS` | recommended | Comma-separated hostnames allowed to receive the token (wildcards OK, e.g. `wro-denmark.dk,*.wro-denmark.dk`). When set, the gateway only hands a token to popups opened by these hosts, and `/auth` rejects other `site_id`s. Leave unset to allow any origin (not recommended in production). |
| `GITHUB_ORIGIN` | no (default `https://github.com`) | Scheme + host of GitHub's OAuth endpoints. Point elsewhere only for GitHub Enterprise Server testing. |
| `PORT` | no (default `8080`) | TCP port the server listens on. |
| `HOST` | no (default `0.0.0.0`) | Interface the server binds to. |

### GitHub OAuth App setup

1. Create an OAuth App on GitHub (Settings → Developer settings → OAuth Apps).
   Homepage URL: the site origin (e.g. `https://beta.wro-denmark.dk`).
2. **Authorization callback URL: `https://auth.wro-denmark.dk/callback`** — the
   gateway origin from `public/cms/config.yml` plus `/callback`. If the gateway
   origin ever changes, the OAuth App must be updated to match.
3. Put the client ID/secret into `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.

The gateway exposes no storage and no other endpoints — unknown paths answer
404, and every failure mode (unsupported provider, disallowed domain, missing
credentials, missing code/state, CSRF mismatch, GitHub refusing the exchange)
answers with a 4xx page instead of crashing.

## Build and run

```bash
docker build -t wro-sveltia-authenticator .
docker run --rm -p 8080:8080 \
  -e GITHUB_CLIENT_ID=… \
  -e GITHUB_CLIENT_SECRET=… \
  -e ALLOWED_DOMAINS=wro-denmark.dk,*.wro-denmark.dk \
  wro-sveltia-authenticator
```

The base image (`node:24.16.0-alpine3.22`) and the dev dependencies
(`typescript`, `@types/node` in `package-lock.json`) are pinned; the runtime
image ships only the compiled `dist/` and has zero npm runtime dependencies.

Smoke checks (expects a 302, a 400, and a 404):

```bash
curl -si 'http://localhost:8080/auth?provider=github' | head -1
curl -si 'http://localhost:8080/callback' | head -1
curl -si 'http://localhost:8088/nope' | head -1
```

## Development

Compile with `npm install && npm run build` inside this directory, then
`npm run start`. The specs run from the repo root via `npm run test` — they
stub GitHub's token endpoint locally, so no network or real OAuth App is
needed.
