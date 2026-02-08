/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-pink': '#FF00FF',
        'neon-blue': '#00FFFF',
        'neon-purple': '#C084FC',
        'dark-bg': '#0e0e10',
        'dark-card': '#1a1a1d',
        'dark-border': '#2c2c2e',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


