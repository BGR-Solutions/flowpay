/**
 * Configuração ESLint compartilhada por todos os workspaces.
 *
 * Usamos o preset `recommended` do typescript-eslint (sem checagem de tipos)
 * para manter o lint rápido; a checagem de tipos é feita separadamente via
 * `tsc --noEmit` (script `typecheck`).
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules', 'storybook-static', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
};
