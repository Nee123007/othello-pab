import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      'ink-950': '#0B0D10',
      'ink-900': '#12161B',
      'ink-800': '#181D24',
      'ink-700': '#262D36',
      'jade-900': '#0C3329',
      'jade-700': '#14513F',
      'jade-600': '#1C6A53',
      'obsidian': '#14171B',
      'pearl': '#F2EDE4',
      'brass-400': '#D9A441',
      'brass-600': '#A87B26',
      'text-100': '#E8E4DA',
      'text-400': '#8A919B',
      'danger': '#E2574C',
      'signal': '#4FB3A3',
      transparent: 'transparent',
      current: 'currentColor',
    },
    fontFamily: {
      serif: ['Fraunces', 'serif'],
      sans: ['"IBM Plex Sans"', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
    borderRadius: {
      DEFAULT: '6px',
      sm: '4px',
      md: '6px',
      lg: '12px',
      full: '9999px',
      none: '0px',
    },
    extend: {
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      boxShadow: {
        'disc': '0 4px 12px rgba(0, 0, 0, 0.45)',
        'panel': '0 8px 24px rgba(0, 0, 0, 0.35)',
      }
    },
  },
  plugins: [],
} satisfies Config

