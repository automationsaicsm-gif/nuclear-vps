/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        base:         '#FFFFFF',
        surface:      '#F9FAFB',
        hero:         '#1A3A8F',
        deep:         '#F3F4F6',
        footer:       '#111827',
        'indigo-mid': '#1E3FA0',
        coral:        '#2D55C8',
        'coral-dark': '#1A3A8F',
        'text-h':     '#111827',
        'text-body':  '#374151',
        'text-muted': '#6B7280',
        'text-dim':   '#9CA3AF',
      },
      fontFamily: {
        heading: ['Nunito', 'sans-serif'],
        body:    ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
