import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds (Photography Studio palette from ui-ux-pro-max) ──
        bg:      '#000000',   // pure black
        'bg-1':  '#0C0C0C',
        'bg-2':  '#18181B',   // card surfaces
        'bg-3':  '#27272A',   // elevated / hover

        // ── Borders ──
        line:    '#27272A',   // subtle
        'line-2':'#3F3F46',   // hover / active

        // ── Accent — violet on dark ──
        accent:  '#A855F7',
        'accent-h': '#9333EA',

        // ── Text hierarchy ──
        't-1':   '#FAFAFA',   // primary
        't-2':   '#A1A1AA',   // secondary
        't-3':   '#52525B',   // muted

        // ── Status (muted to stay in b&w system) ──
        s_ok:    '#C084FC',
        s_error: '#F87171',
        s_warn:  '#FBBF24',
        s_info:  '#A1A1AA',   // info is grey in monochrome system
      },

      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'xs':   ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'sm':   ['13px', { lineHeight: '20px' }],
        'base': ['15px', { lineHeight: '24px' }],
        'md':   ['17px', { lineHeight: '28px' }],
        'lg':   ['20px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        'xl':   ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '2xl':  ['32px', { lineHeight: '40px', letterSpacing: '-0.025em' }],
        '3xl':  ['48px', { lineHeight: '56px', letterSpacing: '-0.03em' }],
        '4xl':  ['60px', { lineHeight: '68px', letterSpacing: '-0.04em' }],
      },

      borderRadius: {
        sm: '4px', md: '6px', lg: '8px',
        xl: '12px', '2xl': '16px', '3xl': '24px',
      },

      boxShadow: {
        sm:     '0 1px 3px rgba(0,0,0,0.8)',
        md:     '0 2px 8px rgba(0,0,0,0.9)',
        accent: '0 0 0 1px rgba(168,85,247,0.35), 0 4px 20px rgba(168,85,247,0.15)',
      },

      animation: {
        'fade-in':  'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'pulse-dot':'pulseDot 2s ease-in-out infinite',
        'rail-flow': 'railFlow 1.15s linear infinite',
        'rail-flow-slow': 'railFlow 2.35s linear infinite',
        'stage-glow': 'stageGlow 2.2s ease-in-out infinite',
        'loop-back-dash': 'loopBackDash 1.85s linear infinite',
      },

      keyframes: {
        fadeIn:   { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        railFlow: {
          '0%':   { transform: 'translateX(-40%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        stageGlow: {
          '0%, 100%': {
            boxShadow:
              '0 0 14px rgba(168,85,247,0.35), 0 0 28px rgba(168,85,247,0.2)',
            borderColor: 'rgba(168,85,247,0.45)',
          },
          '50%': {
            boxShadow:
              '0 0 22px rgba(168,85,247,0.55), 0 0 40px rgba(168,85,247,0.3)',
            borderColor: 'rgba(192,132,252,0.85)',
          },
        },
        loopBackDash: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-48' },
        },
      },
    },
  },
  plugins: [],
}

export default config
