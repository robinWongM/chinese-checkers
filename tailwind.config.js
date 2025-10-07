/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'player1': '#3B82F6',
        'player2': '#EF4444',
      }
    },
  },
  plugins: [],
}

