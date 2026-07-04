import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    devtools(),
    // Official Netlify adapter for TanStack Start: configures the build for
    // Netlify Functions + static assets and emulates the Netlify platform in dev.
    netlify(),
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
        // - /admin: static Decap CMS app, not a TanStack route
        // - /api/auth: Better Auth server handler
        // - /dashboard, /login: authenticated / passkey routes (see auth ADR)
        filter: ({ path }) =>
          !path.startsWith('/admin') &&
          !path.startsWith('/api') &&
          !path.startsWith('/dashboard') &&
          !path.startsWith('/login'),
      },
    }),
    solidPlugin({ ssr: true }),
  ],
})
