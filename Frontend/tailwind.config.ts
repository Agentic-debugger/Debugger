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
        // ── Backgrounds — clean white ──
        bg:      '#FFFFFF',
        'bg-1':  '#FAFAFA',
        'bg-2':  '#F4F4F5',   // zinc-100
        'bg-3':  '#E4E4E7',   // zinc-200

        // ── Borders ──
        line:    '#E4E4E7',   // zinc-200
        'line-2':'#D4D4D8',   // zinc-300

        // ── Accent — black ──
        accent:     '#09090B',  // zinc-950
        'accent-h': '#18181B',  // zinc-900

        // ── Text hierarchy ──
        't-1':  '#09090B',   // near-black
        't-2':  '#52525B',   // zinc-600
        't-3':  '#A1A1AA',   // zinc-400

        // ── Status ──
        s_ok:    '#16A34A',
        s_error: '#DC2626',
        s_warn:  '#D97706',
        s_info:  '#52525B',
      },

      fontFamily: {
        sans:    ['var(--font-sans)',    'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
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
        sm:     '0 1px 3px rgba(0,0,0,0.08)',
        md:     '0 2px 8px rgba(0,0,0,0.1)',
        lg:     '0 4px 20px rgba(0,0,0,0.1)',
        accent: '0 0 0 1px rgba(9,9,11,0.15), 0 4px 16px rgba(9,9,11,0.08)',
      },

      animation: {
        'fade-in':       'fadeIn 0.18s ease-out',
        'slide-up':      'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)',
        'pulse-dot':     'pulseDot 2s ease-in-out infinite',
        'rail-flow':     'railFlow 1.15s linear infinite',
        'rail-flow-slow':'railFlow 2.35s linear infinite',
        'stage-glow':    'stageGlow 2.2s ease-in-out infinite',
        'loop-back-dash':'loopBackDash 1.85s linear infinite',
      },

      keyframes: {
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        railFlow: {
          '0%':   { transform: 'translateX(-40%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        stageGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 2px rgba(9,9,11,0.15), 0 2px 8px rgba(9,9,11,0.1)',
            borderColor: 'rgba(9,9,11,0.7)',
          },
          '50%': {
            boxShadow: '0 0 0 3px rgba(9,9,11,0.2), 0 4px 16px rgba(9,9,11,0.15)',
            borderColor: 'rgba(9,9,11,1)',
          },
        },
        loopBackDash: {
          '0%':   { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-48' },
        },
      },
    },
  },
  plugins: [],
}

export default config
