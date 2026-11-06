/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        'surface-1': 'var(--bg-surface-1)',
        'surface-2': 'var(--bg-surface-2)',
        'surface-3': 'var(--bg-surface-3)',
        'border-str': 'var(--border-structural)',
        'border-foc': 'var(--border-focus)',
        'text-pri': 'var(--text-primary)',
        'text-sec': 'var(--text-secondary)',
        'text-mut': 'var(--text-muted)',
        'acc-orange': 'var(--accent-orange)',
        'acc-cobalt': 'var(--accent-cobalt)',
        'st-pass': 'var(--status-pass)',
        'st-warn': 'var(--status-warn)',
        'st-fail': 'var(--status-fail)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'DEFAULT': '2px',
        'full': '9999px',
      }
    },
  },
  plugins: [],
}

