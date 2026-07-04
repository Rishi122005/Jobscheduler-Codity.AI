/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: 'var(--c-bg-base)',
        darkCard: 'var(--c-bg-surface)',
        darkBorder: 'var(--c-border)',
        neonPurple: '#A855F7',
        neonCyan: '#06B6D4',
        neonPink: '#D946EF',
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
