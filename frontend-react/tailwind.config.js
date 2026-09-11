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
        vaani: {
          darkBg: '#0B0F17',
          darkCard: '#111827',
          darkBorder: '#1F2937',
          lightBg: '#F8FAFC',
          lightCard: '#FFFFFF',
          lightBorder: '#E2E8F0',
          emerald: '#10B981',
          coral: '#EF4444',
          blue: '#38BDF8',
          amber: '#F59E0B',
          purple: '#A855F7',
        },
        dark: {
          950: '#0B0F17',
          900: '#111827',
          850: '#161F30',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'card-light': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
