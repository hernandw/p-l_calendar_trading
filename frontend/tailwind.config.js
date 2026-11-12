/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkSubtle: '#131B2E',
        darkBorder: '#1E293B',
      }
    },
  },
  plugins: [],
}