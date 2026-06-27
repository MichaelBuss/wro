---
name: Build & Deployment
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-06-27
codeAnchors:
  - vite.config.ts
  - netlify.toml
  - package.json
relatedPlans:
  - tech-stack-and-framework
  - routing-and-data-loading
overview: >
  Vite 7 + TanStack Start deployed to Netlify via the official
  @netlify/vite-plugin-tanstack-start adapter, with static prerendering as the
  primary output strategy and a Netlify Function for server-side rendering.
---

# Build & Deployment

> **Status**: Implemented (February 2026; migrated off Nitro June 2026).

## Context

TanStack Start uses Vite as its build tool. The pipeline needs to produce prerendered HTML for the mostly-static content pages while keeping a server runtime available for server functions and dynamic rendering. The site is deployed to Netlify.

## Decision

**Netlify adapter (`@netlify/vite-plugin-tanstack-start`)** — deployment is handled by Netlify's official TanStack Start Vite plugin. A single `vite build` produces a static client in `dist/client/` (including prerendered HTML) plus a Netlify Function at `.netlify/v1/functions/server.mjs` for SSR and server functions. The plugin also emulates the Netlify platform during local development.

**Prerendering as the primary strategy** — with `crawlLinks: true`, the build generates static HTML at build time for all discoverable routes; these serve directly from Netlify's CDN. Server functions handle dynamic requests. `concurrency: 1` keeps the prerender crawl deterministic.

**`/admin` excluded from prerender** — the Decap CMS admin UI at `public/admin/` is a standalone SPA. The prerender filter skips `/admin` paths so TanStack Start doesn't try to render them as routes.

**Content inlined at build time** — markdown under `content/` is bundled into the build via Vite's `import.meta.glob` (`src/server/content.ts`), so content loading is identical in dev and production and needs no server-runtime storage layer. See [CMS Content Layer](cms-content-layer.md).

## Build Pipeline

```
vite build
├── Tailwind CSS (via @tailwindcss/vite)
├── Solid.js (vite-plugin-solid, SSR)
├── TanStack Start (SSR build + prerender crawl)
└── Netlify adapter
    ├── dist/client/  → static assets + prerendered HTML (publish dir)
    └── .netlify/v1/functions/server.mjs → SSR / server functions
```

`netlify.toml` sets `command = "npm run build"` and `publish = "dist/client"`. Deploy by pushing to the connected Netlify site (or `npx netlify deploy`). Day-to-day development uses `npm run dev`; `netlify dev` (Netlify CLI) gives full local platform emulation.

## Alternatives Considered

**Generic Nitro adapter (`nitro/vite` + `preset: 'netlify'`)** — the original approach. Two problems made it a poor fit: TanStack Start's prerender-against-Nitro was unreliable (preview-server race conditions), so prerendering had to be disabled; and TanStack's documented workaround pinned `nitro` to a floating `nitro-nightly@latest`, which drifted between installs and broke the build. The Netlify adapter is the officially recommended path for Netlify, removes the Nitro dependency entirely, and restores working prerendering.

## Consequences

- No Nitro dependency and no floating nightly to drift and break installs.
- Prerendered pages serve instantly from Netlify's CDN; the SSR function handles dynamic requests and server functions.
- Adding a new static page just requires creating a route — `crawlLinks` discovers it automatically.
- Local production-parity behaviour is available via the Netlify CLI (`netlify dev`); there is no standalone Node server entry anymore (the old `npm start` was removed).

## Revision History

- **2026-02-16** (Michael): Initial document capturing build and deployment architecture (Vite + TanStack Start + Nitro nightly, Netlify preset).
- **2026-06-27** (Michael): Migrated deployment from the generic Nitro adapter to the official `@netlify/vite-plugin-tanstack-start`. Removed the `nitro` dependency and `nitro.config.ts`, changed the publish dir to `dist/client`, removed the stale `npm start` script, and re-enabled static prerendering (now working). Motivation: the floating `nitro-nightly@latest` pin drifted and broke the build, and the Netlify adapter is the supported path.
