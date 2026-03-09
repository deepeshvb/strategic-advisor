/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        lobster: {
          50: '#fff5f2',
          100: '#ffe8e0',
          200: '#ffd4c7',
          300: '#ffb39e',
          400: '#ff8a66',
          500: '#f97345',
          600: '#e85d2a',
          700: '#c44a1f',
          800: '#a33d1f',
          900: '#87371e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 40px -12px rgba(249, 115, 69, 0.25)',
        'card': '0 4px 24px -4px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
