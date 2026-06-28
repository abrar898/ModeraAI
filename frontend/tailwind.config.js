/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media', // auto-detect based on OS/browser preference (prefers-color-scheme)
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // "Inspection desk" palette — warm paper, ink, a single amber signal color,
        // and a forest-teal "cleared" color. No purple/blue gradients.
        paper: {
          DEFAULT: '#FAF8F3',
          dim: '#F1EDE3',
        },
        ink: {
          DEFAULT: '#1B2521',
          soft: '#3D453F',
        },
        signal: {
          DEFAULT: '#E8743B',
          dark: '#C85A26',
          light: '#FBDCC6',
        },
        cleared: {
          DEFAULT: '#2F6F4F',
          light: '#D9ECE0',
        },
        mist: {
          DEFAULT: '#E4E1D6',
          dark: '#CFC9B8',
        },
        // Dark mode base
        dusk: {
          DEFAULT: '#10140F',
          raised: '#181E17',
          line: '#2A332B',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grain-light': "radial-gradient(circle at 1px 1px, rgba(27,37,33,0.04) 1px, transparent 0)",
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,37,33,0.04), 0 8px 24px -8px rgba(27,37,33,0.08)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.3), 0 8px 28px -8px rgba(0,0,0,0.5)',
        stamp: '0 12px 32px -8px rgba(232,116,59,0.35)',
        lift: '0 4px 14px -2px rgba(27,37,33,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        drift: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '120px 0' },
        },
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite',
        slideUp: 'slideUp 0.3s ease-out',
        drift: 'drift 14s linear infinite',
      },
    },
  },
  plugins: [],
};
