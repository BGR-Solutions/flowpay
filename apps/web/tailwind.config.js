/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cartoes: '#6366f1',
        emprestimos: '#10b981',
        outros: '#f59e0b',
      },
    },
  },
  plugins: [],
};
