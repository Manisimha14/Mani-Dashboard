/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'hsl(250, 100%, 97%)',
          100: 'hsl(250, 95%, 93%)',
          200: 'hsl(252, 93%, 87%)',
          300: 'hsl(253, 90%, 78%)',
          400: 'hsl(255, 85%, 67%)',
          500: 'hsl(258, 80%, 57%)',
          600: 'hsl(260, 75%, 48%)',
          700: 'hsl(262, 72%, 40%)',
          800: 'hsl(264, 68%, 32%)',
          900: 'hsl(266, 65%, 26%)',
          950: 'hsl(268, 70%, 15%)',
        },
        accent: {
          cyan: 'hsl(186, 100%, 50%)',
          violet: 'hsl(258, 100%, 67%)',
          pink: 'hsl(320, 100%, 67%)',
          emerald: 'hsl(152, 76%, 50%)',
          amber: 'hsl(38, 100%, 60%)',
          rose: 'hsl(350, 100%, 65%)',
        },
        surface: {
          0: 'hsl(225, 20%, 6%)',
          1: 'hsl(225, 18%, 9%)',
          2: 'hsl(225, 16%, 12%)',
          3: 'hsl(225, 14%, 16%)',
          4: 'hsl(225, 12%, 20%)',
          5: 'hsl(225, 10%, 25%)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(139, 92, 246, 0.3)',
        'glow': '0 0 30px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 60px rgba(139, 92, 246, 0.5)',
        'glow-cyan': '0 0 30px rgba(0, 245, 255, 0.4)',
        'glow-pink': '0 0 30px rgba(255, 100, 200, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(139, 92, 246, 0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)',
        'card-hover': '0 8px 48px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'gradient': 'gradient 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blob': 'blob 7s infinite',
        'count-up': 'countUp 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
        'halo': 'halo 2s ease-in-out infinite',
        'timer-pulse': 'timerPulse 1s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        halo: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.4)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 50px rgba(139,92,246,0.8)', transform: 'scale(1.02)' },
        },
        timerPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
