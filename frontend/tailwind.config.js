/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Paleta tomada del logo de VMC: violeta como color principal
        // (marca, botones, navbar) y turquesa como color de acento
        // (destacados, badges, precios).
        primary: {
          50: '#f5f2fb',
          100: '#e9e1f6',
          200: '#cebbe9',
          300: '#b295dc',
          400: '#8f66c9',
          500: '#71449f', // sacado directo del violeta del logo
          600: '#5f3a86',
          700: '#4c2f6c',
          800: '#3a2452',
          900: '#281939',
        },
        accent: {
          50: '#e9fdfa',
          100: '#c9faf1',
          200: '#94f2e3',
          300: '#5fe8d5',
          400: '#2fd8c4', // turquesa del logo
          500: '#1fb5a4',
          600: '#178f82',
          700: '#126e64',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
