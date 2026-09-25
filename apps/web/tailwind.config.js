/**
 * Configuration Tailwind CSS : Thème Liquid Glass révolutionnaire
 * Fusion Apple Liquid Glass (WWDC25) + Google Material 3 Expressive
 * Ultra-translucide, réfraction, halos iridescents, profondeur multi-couches
 * Auteur : Martial Zinsou
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc4fa',
          400: '#38a5f6',
          500: '#0071e3',
          600: '#0077ed',
          700: '#0058b6',
          800: '#004899',
          900: '#003570',
          950: '#001f44',
        },
        imac: {
          blue: '#0071e3',
          purple: '#a855f7',
          pink: '#f43f5e',
          orange: '#f97316',
          yellow: '#eab308',
          green: '#10b981',
          silver: '#e5e5ea',
        },
        glass: {
          50: 'rgba(255,255,255,0.04)',
          100: 'rgba(255,255,255,0.08)',
          200: 'rgba(255,255,255,0.12)',
          300: 'rgba(255,255,255,0.18)',
        },
        ink: {
          50: '#fbfbfd',
          100: '#f5f5f7',
          200: '#e5e5ea',
          300: '#d1d1d6',
          400: '#86868b',
          500: '#6e6e73',
          600: '#48484a',
          700: '#3a3a3c',
          800: '#2c2c2e',
          850: '#242426',
          900: '#1c1c1e',
          950: '#000000',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        '3xl': '40px',
        '4xl': '64px',
      },
      boxShadow: {
        'liquid': '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset',
        'liquid-hover': '0 16px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.15) inset',
        'liquid-glow': '0 0 40px rgba(0,113,227,0.3), 0 0 80px rgba(168,85,247,0.15)',
        'glass': '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'liquid-float': 'liquid-float 6s ease-in-out infinite',
        'liquid-shimmer': 'liquid-shimmer 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
      keyframes: {
        'liquid-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'liquid-shimmer': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
