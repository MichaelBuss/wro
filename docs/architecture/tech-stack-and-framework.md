---
name: Tech Stack & Framework Choice
status: implemented
authors:
  - Michael
created: 2026-02-16
updated: 2026-02-16
codeAnchors:
  - package.json
  - vite.config.ts
  - src/router.tsx
relatedPlans:
  - routing-and-data-loading
  - component-and-ui-system
overview: >
  Solid.js with the full TanStack ecosystem (Router, Query, Form, Start) as the
  foundation for a Danish WRO (World Robot Olympiad) event website, chosen for
  fine-grained reactivity, TanStack ecosystem exploration, and learning.
---

# Tech Stack & Framework Choice

> **Status**: Implemented (February 2026).

## Table of Contents

1. [Problem / Context](#problem--context)
2. [Decision](#decision)
3. [Why This Combination](#why-this-combination)
4. [Key Dependencies](#key-dependencies)
5. [Alternatives Considered](#alternatives-considered)
6. [Revision History](#revision-history)

## Problem / Context

The project is a website for World Robot Olympiad Denmark — an event site with informational pages, a blog, image carousels, and CMS-managed content. It needed server-side rendering, prerendering for static pages, and a modern developer experience.

Rather than reaching for the most popular option, this was an opportunity to explore a less mainstream but technically compelling stack.

## Decision

Build with **Solid.js** and go all-in on the **TanStack ecosystem**:

| Layer | Choice |
|-------|--------|
| UI framework | Solid.js |
| Meta-framework | TanStack Start (Vite + Nitro) |
| Routing | TanStack Solid Router (file-based) |
| Server data | TanStack Start `createServerFn` |
| Async state | TanStack Solid Query (available, not primary yet) |
| Forms | TanStack Solid Form |
| Styling | Tailwind CSS v4, Kobalte, CVA |
| Validation | Zod |
| Language | TypeScript (strict) |

## Why This Combination

**Fine-grained reactivity.** Solid's reactive model avoids virtual DOM diffing entirely. Signals propagate updates directly to the DOM nodes that depend on them. For a content site with interactive elements (carousels, dropdowns, forms), this means less runtime overhead and simpler mental models for state flow.

**TanStack ecosystem.** TanStack libraries are framework-agnostic by design — the same patterns (loaders, server functions, query caching) work across React, Solid, Vue, and Angular. Learning TanStack deeply provides transferable knowledge regardless of which UI framework a future project uses.

**Learning and exploration.** Solid.js + TanStack Start is a less-trodden path than Next.js or Nuxt. Building a real project with it surfaces the rough edges, informs opinions, and builds deeper understanding of both the framework primitives and the TanStack abstractions.

## Key Dependencies

The stack centers on a small number of foundational choices:

- **`solid-js`** — UI rendering with fine-grained reactivity
- **`@tanstack/solid-start`** — SSR/SSG meta-framework built on Vite + Nitro
- **`@tanstack/solid-router`** — Type-safe, file-based routing with loaders
- **`vite` (v7)** — Build tool and dev server
- **`nitro` (nightly)** — Server engine powering TanStack Start (nightly required for compatibility)
- **`zod`** — Runtime validation for content, env vars, and server function inputs

## Alternatives Considered

**Next.js (React):** The obvious default for a content site with SSR/SSG. Rejected because React's reconciliation model is heavier than needed here, and the goal was to explore beyond the React ecosystem.

**Astro:** Excellent for content sites, with built-in Markdown support and partial hydration. Would have been a strong practical choice, but the goal was deeper framework exploration — Astro abstracts away too much of the rendering layer.

**SvelteKit:** Also has fine-grained reactivity (Svelte 5 runes). A viable alternative, but TanStack's cross-framework portability was more appealing than Svelte's tighter coupling to its own ecosystem.

**Nuxt (Vue):** Similar maturity to Next.js but in the Vue ecosystem. Vue's reactivity model is closer to Solid's, but Solid is more minimal and the TanStack Solid bindings were the primary draw.

## Revision History

- **2026-02-16** (Michael): Initial document capturing tech stack rationale
