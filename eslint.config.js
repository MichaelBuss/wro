import { tanstackConfig } from '@tanstack/eslint-config'
import vitest from '@vitest/eslint-plugin'
import { defineConfig } from 'eslint/config'
import drizzle from 'eslint-plugin-drizzle'
import eslintComments from 'eslint-plugin-eslint-comments'
import importX from 'eslint-plugin-import-x'
import solid from 'eslint-plugin-solid/configs/typescript'
import tseslint from 'typescript-eslint'

// Filter out tanstackConfig's parserOptions to avoid conflict with projectService
const tanstackRules = tanstackConfig.map((config) => {
  if (config.languageOptions?.parserOptions?.project) {
    const restParserOptions = Object.fromEntries(
      Object.entries(config.languageOptions.parserOptions).filter(
        ([key]) => key !== 'project',
      ),
    )
    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: restParserOptions,
      },
    }
  }
  return config
})

export default defineConfig([
  // Ignores
  { ignores: ['node_modules', 'dist', '.output', '.netlify', '**/*.gen.ts'] },

  // TanStack config (rules only, parser options filtered)
  ...tanstackRules,

  // Base TypeScript config
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Solid.js
  solid,

  // Import rules
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  // Enforce AGENTS.md rules via lint — no eslint-disable comments, no `as` assertions
  {
    plugins: { 'eslint-comments': eslintComments },
    rules: {
      // AGENTS.md: "Never use eslint-disable comments"
      'eslint-comments/no-use': ['error', { allow: [] }],
      // AGENTS.md: "No type assertions (as, !)"
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
    },
  },

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.js', '.cursor/hooks/*.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-unresolved': 'off', // TypeScript handles this
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      // Disable tanstack's import/order in favor of import-x/order
      'import/order': 'off',
      // Use Array<T> style
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    },
  },

  // Drizzle: guard against catastrophic data loss on the registration/PII tables.
  // A bare db.delete()/db.update() without .where() would hit every row, so make
  // it a lint error. `db` is the shared Drizzle handle name used by every accessor.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { drizzle },
    rules: {
      'drizzle/enforce-delete-with-where': [
        'error',
        { drizzleObjectName: ['db'] },
      ],
      'drizzle/enforce-update-with-where': [
        'error',
        { drizzleObjectName: ['db'] },
      ],
    },
  },

  // Vitest: enforce the project's testing conventions on spec files. Notably,
  // no focused (.only) or skipped tests may be committed — a suite with skipped
  // tests is not a passing suite (see .cursor/skills/testing/SKILL.md).
  {
    files: ['**/*.spec.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
    },
  },

  // Prose renders repo-managed markdown (committed files, not user input).
  // innerHTML is acceptable at this trust boundary.
  {
    files: ['src/components/ui/Prose.tsx'],
    rules: {
      'solid/no-innerhtml': 'off',
    },
  },

  // These files use `as` assertions that are genuinely unavoidable:
  // - utils.ts: typed wrappers around Object.keys/entries/values
  // - images/index.ts: generic indexed access on const objects
  // - button.tsx: Kobalte polymorphic splitProps pattern (no cast = type error)
  {
    files: [
      'src/lib/utils.ts',
      'src/lib/images/index.ts',
      'src/components/ui/button.tsx',
    ],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
])
