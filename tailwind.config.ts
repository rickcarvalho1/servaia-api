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
        ink:     '#0E1117',
        slate:   '#1C2333',
        accent:  '#4F8EF7',
        gold:    '#E8B84B',
        mist:    '#EDF0F7',
        mid:     '#6B7490',
        border:  '#DDE1EC',
        success: '#3DBF7F',
        danger:  '#E05252',
        warn:    '#E8A020',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config