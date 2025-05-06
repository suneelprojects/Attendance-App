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
          100: '#e6f0ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'rotate-move': 'rotate-move 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        'rotate-move': {
          '55%': {
            transform: 'translate(-50%, -50%) rotate(0deg)',
          },
          '80%': {
            transform: 'translate(-50%, -50%) rotate(360deg)',
          },
          '100%': {
            transform: 'translate(-50%, -50%) rotate(360deg)',
          },
        },
        'dot-3-move': {
          '20%': {
            transform: 'scale(1)',
          },
          '45%': {
            transform: 'translateY(-18px) scale(0.45)',
          },
          '60%': {
            transform: 'translateY(-90px) scale(0.45)',
          },
          '80%': {
            transform: 'translateY(-90px) scale(0.45)',
          },
          '100%': {
            transform: 'translateY(0px) scale(1)',
          },
        },
        'dot-2-move': {
          '20%': {
            transform: 'scale(1)',
          },
          '45%': {
            transform: 'translate(-16px, 12px) scale(0.45)',
          },
          '60%': {
            transform: 'translate(-80px, 60px) scale(0.45)',
          },
          '80%': {
            transform: 'translate(-80px, 60px) scale(0.45)',
          },
          '100%': {
            transform: 'translateY(0px) scale(1)',
          },
        },
        'dot-1-move': {
          '20%': {
            transform: 'scale(1)',
          },
          '45%': {
            transform: 'translate(16px, 12px) scale(0.45)',
          },
          '60%': {
            transform: 'translate(80px, 60px) scale(0.45)',
          },
          '80%': {
            transform: 'translate(80px, 60px) scale(0.45)',
          },
          '100%': {
            transform: 'translateY(0px) scale(1)',
          },
        },
        index: {
          '0%, 100%': {
            zIndex: '3',
          },
          '33.3%': {
            zIndex: '2',
          },
          '66.6%': {
            zIndex: '1',
          },
        },
      },
    },
  },
  plugins: [],
};