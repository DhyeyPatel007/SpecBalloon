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
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        'border-hairline': 'var(--border-hairline)',
        'border-strong': 'var(--border-strong)',
        'text-pri': 'var(--text-primary)',
        'text-sec': 'var(--text-secondary)',
        'text-mut': 'var(--text-muted)',
        'accent-primary': 'var(--accent-primary)',
        'accent-balloon': 'var(--accent-balloon)',
        'status-pass': 'var(--status-pass)',
        'status-warn': 'var(--status-warn)',
        'status-fail': 'var(--status-fail)',

        // Backwards compatibility aliases
        canvas: 'var(--bg-page)',
        'surface-1': 'var(--bg-surface)',
        'surface-2': 'var(--bg-subtle)',
        'surface-3': 'var(--bg-subtle)',
        'border-str': 'var(--border-hairline)',
        'border-foc': 'var(--accent-primary)',
        'acc-orange': 'var(--accent-balloon)',
        'acc-cobalt': 'var(--accent-primary)',
        'st-pass': 'var(--status-pass)',
        'st-warn': 'var(--status-warn)',
        'st-fail': 'var(--status-fail)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)',
        'apple-md': '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
        'apple-lg': '0 12px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'artboard': '0 8px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'ribbon': '0 1px 3px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
