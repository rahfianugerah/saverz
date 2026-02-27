/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#111113',
        'surface-hover': '#1a1a1d',
        border: '#27272a',
        'border-muted': '#3f3f46',
        foreground: '#fafafa',
        muted: '#a1a1aa',
        accent: '#6d28d9',
        'accent-hover': '#7c3aed',
        danger: '#ef4444',
        success: '#22c55e',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
