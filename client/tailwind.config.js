/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        sonar: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        fieldFlash: {
          '0%': { backgroundColor: '#dcfce7' },
          '100%': { backgroundColor: 'transparent' },
        },
        dotBounce: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        sonar: 'sonar 1.2s ease-out infinite',
        fieldFlash: 'fieldFlash 0.9s ease-out',
        dotBounce: 'dotBounce 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
