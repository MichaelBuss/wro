import { tanstackConfig } from '@tanstack/eslint-config'
import { defineConfig } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import solid from 'eslint-plugin-solid/configs/typescript'
import tseslint from 'typescript-eslint'

// Filter out tanstackConfig's parserOptions to avoid conflict with projectService
const tanstackRules = tanstackConfig.map((config) => {
  if (config.languageOptions?.parserOptions?.project) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { project, ...restParserOptions } =
      config.languageOptions.parserOptions
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
  { ignores: ['node_modules', 'dist', '.output', '**/*.gen.ts'] },

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

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.js'],
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
])
