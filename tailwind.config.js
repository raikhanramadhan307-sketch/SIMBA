/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: {
        brand: { 50: '#eaf6f0', 100: '#d3ecdf', 200: '#a9d9c0', 500: '#1f9d63', 600: '#168a57', 700: '#117049', 800: '#0d5a3b' },
      },
    },
  },
  plugins: [],
};
