/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'pr-',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './premium-ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        xl: 'var(--pr-radius)',
        '2xl': 'calc(var(--pr-radius) + 8px)',
      },
      boxShadow: {
        md: 'var(--pr-shadow-md)',
        lg: 'var(--pr-shadow-lg)',
      },
      fontSize: {
        h2: ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        h5: ['18px', { lineHeight: '1.25', fontWeight: '600' }],
        small: ['12px', { lineHeight: '1.3' }],
      },
    },
  },
  corePlugins: {
    preflight: false, // avoid touching global element styles
  },
  plugins: [],
};
