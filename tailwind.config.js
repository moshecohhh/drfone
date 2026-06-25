/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the ד״ר פון logo.
        // Primary teal = #108c8b, ink/charcoal = #403f41, on white.
        brand: {
          50: '#e8f6f6',
          100: '#c5e8e7',
          200: '#93d4d2',
          300: '#5cbcb9',
          400: '#2aa3a0',
          500: '#108c8b', // exact logo teal (primary)
          600: '#0d7271',
          700: '#0b5b5a',
          800: '#094746',
          900: '#073737',
        },
        // Charcoal used for text and dark accents (logo's dark color).
        ink: {
          DEFAULT: '#403f41',
          light: '#5a585c',
          dark: '#2b2a2c',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Assistant', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 28px rgba(6, 182, 212, 0.18)',
      },
    },
  },
  plugins: [],
}
