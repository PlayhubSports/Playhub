/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores PlayHub — APENAS valores sólidos (sem rgba)
        // rgba é definido como CSS var e usado via arbitrary values
        ph: {
          blue:  '#1DA1F2',
          teal:  '#00C9A7',
          green: '#7ED321',
          gold:  '#FFD700',
          dark:  '#060D14',
          dark2: '#0C1A26',
          card:  '#0F1C2A',
          card2: '#132233',
          muted: '#5A7A94',
          text:  '#F0F7FF',
          // border removido daqui — usar var(--ph-border) diretamente no CSS
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      // backgroundImage NÃO funciona com @apply — definidos como CSS vars
      boxShadow: {
        'ph':      '0 8px 24px rgba(29,161,242,0.28)',
        'ph-lg':   '0 12px 32px rgba(29,161,242,0.38)',
        'ph-gold': '0 4px 16px rgba(255,165,0,0.4)',
      },
      borderRadius: {
        'ph':    '12px',
        'ph-lg': '16px',
        'ph-xl': '22px',
      },
      animation: {
        'ph-pop':   'phPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        'ph-up':    'phUp 0.4s ease both',
        'ph-pulse': 'phPulse 2s ease-in-out infinite',
      },
      keyframes: {
        phPop:   { from: { opacity: '0', transform: 'scale(0.5)' }, to: { opacity: '1', transform: 'scale(1)' } },
        phUp:    { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        phPulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
    },
  },
  plugins: [],
}
