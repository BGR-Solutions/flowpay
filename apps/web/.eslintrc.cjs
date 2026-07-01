/**
 * Configuração ESLint específica do front-end (estende a raiz e adiciona
 * regras de React/Hooks e ambiente de browser).
 */
module.exports = {
  extends: [
    'plugin:react-hooks/recommended',
    'plugin:storybook/recommended',
  ],
  plugins: ['react-refresh'],
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
