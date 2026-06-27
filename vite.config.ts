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
        // Exclude /admin since it's a static Decap CMS app, not a TanStack route
        filter: ({ path }) => !path.startsWith('/admin'),
      },
    }),
    solidPlugin({ ssr: true }),
  ],
})
