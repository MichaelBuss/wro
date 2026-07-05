import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Standalone Vitest config: deliberately omits the app's SSR/Netlify plugins so
// the data-layer and pure-logic specs run in a fast Node environment.
export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
