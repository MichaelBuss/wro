import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

// No deploy-target plugin: `vite build` emits the client (static assets +
// prerendered HTML) into dist/client and a fetch-style SSR handler into
// dist/server/server.js. src/server/production-server.mjs serves both from a
// single Node process (see docs/architecture/build-and-deployment.md).
export default defineConfig({
  plugins: [
    devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        concurrency: 1,
        crawlLinks: true,
        // Exclude routes that must render dynamically rather than be prerendered:
        // - /cms: static Sveltia CMS app, not a TanStack route
        // - /api/auth: Better Auth server handler
        // - /dashboard, /login: authenticated / passkey routes (see auth ADR)
        // - /organizer: organizer-gated routes (role-checked at request time)
        // - /recover: recovery link pages (token-specific, single-use)
        filter: ({ path }) =>
          !path.startsWith('/cms') &&
          !path.startsWith('/api') &&
          !path.startsWith('/dashboard') &&
          !path.startsWith('/login') &&
          !path.startsWith('/organizer') &&
          !path.startsWith('/recover'),
      },
    }),
    solidPlugin({ ssr: true }),
  ],
})
