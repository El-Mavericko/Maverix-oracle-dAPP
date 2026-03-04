/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
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
      animation: {
        'gradient-x': 'gradient-x 4s ease infinite',
        'pulse-ring':  'pulse-ring 1.5s ease-in-out infinite',
        'grid-drift':  'grid-drift 22s linear infinite',
        'spin-slow':   'spin 1.2s linear infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'pulse-ring': {
          '0%':   { 'box-shadow': '0 0 0 0    rgba(0,255,255,0.55)' },
          '70%':  { 'box-shadow': '0 0 0 10px rgba(0,255,255,0)'    },
          '100%': { 'box-shadow': '0 0 0 0    rgba(0,255,255,0)'    },
        },
        'grid-drift': {
          '0%':   { 'background-position': '0 0' },
          '100%': { 'background-position': '30px 30px' },
        },
      },
    },
  },
  plugins: [],
}


