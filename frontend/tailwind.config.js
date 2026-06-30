/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf3',
          100: '#d6f9e1',
          200: '#aef0c4',
          300: '#79e3a1',
          400: '#43cd7c',
          500: '#21b261',
          600: '#15914d',
          700: '#137440',
          800: '#135c36',
          900: '#114c2f',
          950: '#062a19',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(33,178,97,0.25), 0 18px 40px -16px rgba(6,42,25,0.55)',
      },
    },
  },
  plugins: [],
}
