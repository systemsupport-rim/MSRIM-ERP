/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        msrim: {
          blue: '#003087',
          'blue-dark': '#001f5b',
          'blue-light': '#1e56a0',
          orange: '#f97316',
          'orange-dark': '#ea580c',
          'orange-light': '#fb923c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
