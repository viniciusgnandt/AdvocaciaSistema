/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // paleta autoral (petroleo/teal escuro) - substitui o azul generico do Tailwind
        // para dar identidade visual propria ao Trilva, mantendo a mesma confiabilidade
        // "profissional" que o azul transmitia
        brand: {
          50: '#eef6f6',
          100: '#d3e9e8',
          200: '#a8d3d1',
          300: '#74b6b3',
          400: '#439795',
          500: '#2a7d7b',
          600: '#1f6664',
          700: '#1a5250',
          800: '#174241',
          900: '#143735',
        },
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fadeIn .2s ease forwards',
        'scale-in': 'scaleIn .15s ease forwards',
      },
    },
  },
  plugins: [],
};
