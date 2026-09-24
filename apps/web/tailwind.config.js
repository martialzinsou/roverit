/**
 * Configuration Tailwind CSS : Thème Apple iMac (https://www.apple.com/fr/imac/)
 * Palette Apple Blue iconique, gris système macOS profonds, 7 couleurs iMac emblématiques
 * (Bleu, Mauve, Rose, Orange, Jaune, Vert, Argent) et typographie San Francisco.
 * Auteur : Martial Zinsou
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Apple Blue & accent
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc4fa',
          400: '#38a5f6',
          500: '#0071e3', // Bleu Apple iconique
          600: '#0077ed',
          700: '#0058b6',
          800: '#004899',
          900: '#003570',
          950: '#001f44',
        },
        // Les 7 couleurs éclatantes de l'iMac M4
        imac: {
          blue: '#0071e3',
          purple: '#a855f7',
          pink: '#f43f5e',
          orange: '#f97316',
          yellow: '#eab308',
          green: '#10b981',
          silver: '#e5e5ea',
        },
        // Palette système Apple (Canvas sombre, surfaces verre et typographies)
        ink: {
          50: '#fbfbfd',
          100: '#f5f5f7', // Blanc cassé Apple
          200: '#e5e5ea',
          300: '#d1d1d6',
          400: '#86868b', // Gris secondaire Apple emblématique
          500: '#6e6e73',
          600: '#48484a',
          700: '#3a3a3c',
          800: '#2c2c2e', // Surface tertiaire
          850: '#242426',
          900: '#1c1c1e', // Fond secondaire de fenêtre
          950: '#000000', // Noir pur Apple
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'apple-card': '0 8px 30px rgba(0, 0, 0, 0.35)',
        'apple-glow': '0 0 30px rgba(0, 113, 227, 0.25)',
        'apple-pill': '0 2px 10px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};