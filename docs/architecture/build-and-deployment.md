---
name: Build & Deployment
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - vite.config.ts
  - nitro.config.ts
  - package.json
relatedPlans:
  - tech-stack-and-framework
  - routing-and-data-loading
overview: >
  Vite 7 + TanStack Start + Nitro (nightly, for compatibility) with prerendering
  as the primary output strategy, deployed to Netlify.
---

# Build & Deployment

> **Status**: Implemented (February 2026).

## Context

TanStack Start uses Vite as the build tool and Nitro as the server engine. The build pipeline needs to produce prerendered HTML for content pages while keeping a server runtime available for server functions and future dynamic features.

## Decision

**Nitro nightly** — the project uses `nitro-nightly@latest` instead of stable Nitro. This is a compatibility requirement: TanStack Start's Vite plugin depends on Nitro features that haven't landed in a stable release yet. The trade-off is potential instability from nightly builds, but TanStack Start itself tracks this dependency.

**Prerendering as the final strategy** — the site is mostly static content (info pages, blog posts, carousel). Prerendering with `crawlLinks: true` generates static HTML at build time for all discoverable routes. This is the intended long-term approach, not a stepping stone to full SSR.

**Netlify preset** — `nitro.config.ts` sets `preset: 'netlify'`, which outputs Netlify Functions for any server-side routes and static HTML for prerendered pages. This gives the best of both worlds: static serving for content, server functions when needed.

**`/admin` excluded from prerender** — the Decap CMS admin UI at `public/admin/` is a standalone SPA. The prerender filter skips `/admin` paths to avoid TanStack Start trying to render them as routes.

## Build Pipeline

```
vite build
├── Tailwind CSS (via @tailwindcss/vite)
├── TanStack Start (SSR + prerender)
├── Solid.js (vite-plugin-solid with SSR)
├── Nitro (server bundle → .output/)
└── Output: .output/server/ + prerendered HTML
```

Production server: `node .output/server/index.mjs` or deployed as Netlify Functions.

## Consequences

- Tied to Nitro nightly until TanStack Start supports stable Nitro — version bumps need testing
- Prerendered pages serve instantly from CDN; server functions handle dynamic requests
- Adding a new static page just requires creating a route — crawlLinks discovers it automatically

## Revision History

- **2026-02-16** (Michael): Initial document capturing build and deployment architecture
