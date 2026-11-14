import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

/**
 * The workspace's base ESLint config: strict, type-aware rules for TypeScript,
 * with formatting left to Prettier. The root `eslint.config.js` adds
 * `tsconfigRootDir`; apps add their own framework rules on top.
 */
export default defineConfig(
  globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/', 'docs/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    // Plain JavaScript (config files) belongs to no tsconfig, so it gets no type-aware rules.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
