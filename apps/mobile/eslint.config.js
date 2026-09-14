const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const boundaries = require('eslint-plugin-boundaries');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Jest setup script (CommonJS, runs outside the TypeScript/`src` tree): needs the
    // Jest global so `jest.mock(...)` doesn't trip `no-undef`.
    files: ['jest.setup.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
        { type: 'app', pattern: 'src/app/**' },
      ],
    },
    rules: {
      // Single `dependencies` rule (current, non-deprecated API) governing both
      // internal layer boundaries and external/core module access.
      // `checkAllOrigins: true` makes it also evaluate external (npm) and core
      // (Node builtin) imports, not just imports between internal elements —
      // without it, `domain` importing an npm package would silently pass.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { type: ['domain', 'application'] } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: { to: { element: { type: ['domain', 'application', 'infrastructure'] } } },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: { to: { element: { type: ['domain', 'application', 'presentation'] } } },
            },
            // `app` is the composition root (Expo Router route files + root layout): it may
            // wire up `infrastructure` directly to build services, and render `presentation`.
            // The fine-grained restriction (only the root layout touches `infrastructure`) is
            // enforced by convention and code review, not by this rule.
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: ['presentation', 'infrastructure'] } } },
            },
            // Only non-domain layers may depend on external npm packages or
            // Node core builtins; `domain` has no allow policy for external
            // origins, so it falls through to `default: 'disallow'`.
            {
              from: { element: { type: ['application', 'infrastructure', 'presentation', 'app'] } },
              allow: { to: { module: { origin: ['external', 'core'] } } },
            },
          ],
        },
      ],
      'boundaries/no-unknown-files': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
