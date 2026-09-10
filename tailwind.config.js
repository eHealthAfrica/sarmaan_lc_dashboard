/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0faf5',
          100: '#d8f3e7',
          200: '#b2e6d0',
          300: '#7dd1b3',
          400: '#46b490',
          500: '#26976e',
          600: '#1a7a59',
          700: '#155c3a',  // primary
          800: '#124d31',
          900: '#0e3f28',
        },
        surface: {
          DEFAULT: '#f7f6f2',
          card: '#ffffff',
          border: '#e8e7e0',
          muted: '#f2f1ec',
        },
        ink: {
          DEFAULT: '#1a1a18',
          secondary: '#4a4a46',
          muted: '#8a8a84',
          faint: '#c4c4be',
        },
        status: {
          green:  '#1D9E75',
          amber:  '#d97706',
          red:    '#dc2626',
          blue:   '#2563eb',
          purple: '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
