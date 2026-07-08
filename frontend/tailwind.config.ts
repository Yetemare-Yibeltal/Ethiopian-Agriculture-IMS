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
      // ─── Brand Colors ───────────────────────────────────
      colors: {
        // Primary — Ethiopian green
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          DEFAULT: '#00ff88',
          foreground: '#001a0e',
        },
        // Accent — cyan blue
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          DEFAULT: '#00d4ff',
          foreground: '#001a2e',
        },
        // Purple
        purple: {
          DEFAULT: '#7b2fff',
          light: '#a78bfa',
          dark: '#4c1d95',
        },
        // Background
        background: {
          DEFAULT: '#060d18',
          secondary: '#0a1a0e',
          tertiary: '#0e0a1f',
        },
        // Glass
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        // Status colors
        success: {
          DEFAULT: '#4ade80',
          light: '#86efac',
          dark: '#166534',
        },
        warning: {
          DEFAULT: '#fbbf24',
          light: '#fde68a',
          dark: '#92400e',
        },
        danger: {
          DEFAULT: '#f87171',
          light: '#fca5a5',
          dark: '#991b1b',
        },
        info: {
          DEFAULT: '#60a5fa',
          light: '#93c5fd',
          dark: '#1e40af',
        },
      },

      // ─── Background Images ───────────────────────────────
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-main':
          'linear-gradient(160deg, #060d18 0%, #0a1a0e 40%, #0e0a1f 80%, #060d18 100%)',
        'gradient-green':
          'linear-gradient(135deg, #00ff88, #00d4ff)',
        'gradient-purple':
          'linear-gradient(135deg, #7b2fff, #00d4ff)',
        'gradient-warm':
          'linear-gradient(135deg, #ff6b35, #ff3366)',
        'gradient-hero':
          'linear-gradient(135deg, #fff 0%, #00ff88 40%, #00d4ff 70%, #a78bfa 100%)',
        'glass-card':
          'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
      },

      // ─── Font Family ─────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        amharic: ['Noto Sans Ethiopic', 'sans-serif'],
      },

      // ─── Font Size ───────────────────────────────────────
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },

      // ─── Border Radius ───────────────────────────────────
      borderRadius: {
        none: '0',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },

      // ─── Box Shadow ──────────────────────────────────────
      boxShadow: {
        glass:
          '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg':
          '0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        green: '0 8px 30px rgba(0, 255, 136, 0.35)',
        'green-lg': '0 12px 50px rgba(0, 255, 136, 0.5)',
        cyan: '0 8px 30px rgba(0, 212, 255, 0.35)',
        purple: '0 8px 30px rgba(123, 47, 255, 0.35)',
        red: '0 8px 30px rgba(255, 107, 53, 0.35)',
        glow: '0 0 20px rgba(0, 255, 136, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.4)',
      },

      // ─── Backdrop Blur ───────────────────────────────────
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '40px',
      },

      // ─── Animation ───────────────────────────────────────
      animation: {
        // Gradient animations
        'gradient-shift': 'gradientShift 4s ease infinite',
        'gradient-x': 'gradientX 3s ease infinite',
        // Float animations
        'float-slow': 'float 8s ease-in-out infinite',
        'float-medium': 'float 6s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        // Pulse animations
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        // Spin animations
        'spin-slow': 'spin 6s linear infinite',
        // Particle animations
        'particle-float': 'particleFloat linear infinite',
        // Fade animations
        'fade-in': 'fadeIn 0.5s ease forwards',
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
        'fade-in-down': 'fadeInDown 0.6s ease forwards',
        // Scale animations
        'scale-in': 'scaleIn 0.3s ease forwards',
        // Bar animations
        'grow-bar': 'growBar 1.5s ease forwards',
        'fill-bar': 'fillBar 2s ease forwards',
        // Shimmer
        shimmer: 'shimmer 2s linear infinite',
        // Count up
        'count-up': 'countUp 2s ease forwards',
        // Typewriter
        typewriter: 'typewriter 3s steps(40) forwards',
      },

      // ─── Keyframes ───────────────────────────────────────
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        pulseGreen: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(0, 255, 136, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(0, 255, 136, 0)',
          },
        },
        particleFloat: {
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
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        growBar: {
          '0%': { height: '0 !important' },
          '100%': { height: 'var(--bar-height)' },
        },
        fillBar: {
          '0%': { width: '0' },
          '100%': { width: 'var(--fill-width)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },

      // ─── Spacing ─────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },

      // ─── Z-index ─────────────────────────────────────────
      zIndex: {
        '1': '1',
        '2': '2',
        '3': '3',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // ─── Screens ─────────────────────────────────────────
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },

      // ─── Transition ──────────────────────────────────────
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;
