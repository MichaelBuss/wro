import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: false, // Temporarily disabled - see https://github.com/TanStack/router/issues/6322
        crawlLinks: true,
        // Exclude /admin since it's a static Decap CMS app, not a TanStack route
        filter: ({ path }) => !path.startsWith('/admin'),
      },
    }),
    solidPlugin({ ssr: true }),
  ],
})
