/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        base:         '#1E1B4B',
        surface:      '#252272',
        hero:         '#312E81',
        deep:         '#13114A',
        footer:       '#0D0B33',
        'indigo-mid': '#4F46E5',
        coral:        '#F87171',
        'coral-dark': '#EF4444',
        'text-h':     '#E0E7FF',
        'text-body':  '#C7D2FE',
        'text-muted': '#818CF8',
        'text-dim':   '#6366F1',
      },
      fontFamily: {
        heading: ['Nunito', 'sans-serif'],
        body:    ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
