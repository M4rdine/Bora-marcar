import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage/**', 'dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { rules: { 'no-console': 'error', '@typescript-eslint/consistent-type-imports': 'error' } },
);
