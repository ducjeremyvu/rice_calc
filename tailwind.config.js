import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      colors: {
        rice: {
          50: 'var(--rice-50)',
          100: 'var(--rice-100)',
          200: 'var(--rice-200)',
          300: 'var(--rice-300)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
        },
        sesame: {
          400: 'var(--sesame-400)',
          500: 'var(--sesame-500)',
          700: 'var(--sesame-700)',
        },
        chili: {
          500: 'var(--chili-500)',
        },
      },
    },
  },
  plugins: [forms],
}
