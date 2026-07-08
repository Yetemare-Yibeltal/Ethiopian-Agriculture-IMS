import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Color System ────────────────────────────────────
      colors: {
        // Brand colors
        brand: {
          green: '#00ff88',
          cyan: '#00d4ff',
          purple: '#7b2fff',
          orange: '#ff6b35',
          pink: '#ff3366',
        },
        // Background layers
        bg: {
          primary: '#060d18',
          secondary: '#0a1a0e',
          tertiary: '#0e0a1f',
          card: 'rgba(255, 255, 255, 0.04)',
          'card-hover': 'rgba(255, 255, 255, 0.08)',
        },
        // Glass effect colors
        glass: {
          border: 'rgba(255, 255, 255, 0.10)',
          'border-hover': 'rgba(255, 255, 255, 0.25)',
          bg: 'rgba(255, 255, 255, 0.04)',
          'bg-hover': 'rgba(255, 255, 255, 0.08)',
        },
        // Status colors
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#f87171',
          info: '#60a5fa',
        },
        // Text colors
        text: {
          primary: 'rgba(255, 255, 255, 0.90)',
          secondary: 'rgba(255, 255, 255, 0.60)',
          muted: 'rgba(255, 255, 255, 0.35)',
          disabled: 'rgba(255, 255, 255, 0.20)',
        },
      },

      // ─── Background Gradients ────────────────────────────
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-brand':
          'linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #7b2fff 100%)',
        'gradient-hero':
          'linear-gradient(160deg, #060d18 0%, #0a1a0e 40%, #0e0a1f 80%, #060d18 100%)',
        'gradient-card':
          'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-success':
          'linear-gradient(135deg, #00ff88, #00d4ff)',
        'gradient-warning':
          'linear-gradient(135deg, #fbbf24, #ff6b35)',
        'gradient-danger':
          'linear-gradient(135deg, #ff3366, #ff6b35)',
        'gradient-purple':
          'linear-gradient(135deg, #7b2fff, #00d4ff)',
      },

      // ─── Animations ──────────────────────────────────────
      animation: {
        'gradient-shift': 'gradientShift 5s ease infinite',
        'float-orb': 'floatOrb 8s ease-in-out infinite',
        'float-particle': 'floatParticle linear infinite',
        'spin-slow': 'spinSlow 6s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease forwards',
        'slide-down': 'slideDown 0.5s ease forwards',
        'slide-in-right': 'slideInRight 0.3s ease forwards',
        'fade-in': 'fadeIn 0.5s ease forwards',
        'count-up': 'countUp 2s ease forwards',
        'bar-grow': 'barGrow 1.5s ease forwards',
        'fill-bar': 'fillBar 2s ease forwards',
        shimmer: 'shimmer 2s infinite',
      },

      // ─── Keyframes ───────────────────────────────────────
      keyframes: {
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        floatOrb: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-30px) scale(1.08)' },
        },
        floatParticle: {
          '0%': {
            transform: 'translateY(100vh) rotate(0deg)',
            opacity: '0',
          },
          '10%': { opacity: '0.4' },
          '90%': { opacity: '0.2' },
          '100%': {
            transform: 'translateY(-50px) rotate(720deg)',
            opacity: '0',
          },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(0, 255, 136, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(0, 255, 136, 0)',
          },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        barGrow: {
          from: { height: '0 !important' },
          to: {},
        },
        fillBar: {
          from: { width: '0' },
          to: {},
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ─── Font Family ─────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      // ─── Font Size ───────────────────────────────────────
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1.1' }],
      },

      // ─── Border Radius ───────────────────────────────────
      borderRadius: {
        none: '0',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        full: '9999px',
      },

      // ─── Box Shadow (Glow Effects) ────────────────────────
      boxShadow: {
        'glow-green':
          '0 0 20px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1)',
        'glow-cyan':
          '0 0 20px rgba(0, 212, 255, 0.3), 0 0 60px rgba(0, 212, 255, 0.1)',
        'glow-purple':
          '0 0 20px rgba(123, 47, 255, 0.3), 0 0 60px rgba(123, 47, 255, 0.1)',
        'glow-orange':
          '0 0 20px rgba(255, 107, 53, 0.3), 0 0 60px rgba(255, 107, 53, 0.1)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.5)',
        modal: '0 25px 100px rgba(0, 0, 0, 0.6)',
      },

      // ─── Backdrop Blur ───────────────────────────────────
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '40px',
      },

      // ─── Spacing ─────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '68': '17rem',
        '84': '21rem',
        '88': '22rem',
        '92': '23rem',
        '100': '25rem',
        '112': '28rem',
        '120': '30rem',
        '128': '32rem',
      },

      // ─── Z Index ─────────────────────────────────────────
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // ─── Transition Duration ─────────────────────────────
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '900': '900ms',
        '1200': '1200ms',
        '1500': '1500ms',
        '2000': '2000ms',
      },

      // ─── Background Size ─────────────────────────────────
      backgroundSize: {
        '200': '200% 200%',
        '300': '300% 300%',
      },

      // ─── Screen breakpoints ──────────────────────────────
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;
