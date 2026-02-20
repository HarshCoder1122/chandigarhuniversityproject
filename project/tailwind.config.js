/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary colors - earth tones for agriculture theme
        green: {
          50: '#f0f9f0',
          100: '#dcf0dc',
          200: '#bae2bd',
          300: '#8fcf93',
          400: '#5fb865',
          500: '#3f9d45',
          600: '#2e7f33',
          700: '#266a2b',
          800: '#205425',
          900: '#1c4620',
          950: '#0c2710',
        },
        brown: {
          50: '#faf6f1',
          100: '#f0e8dd',
          200: '#e1d0bb',
          300: '#d0b394',
          400: '#c19570',
          500: '#b17a53',
          600: '#a06549',
          700: '#84513d',
          800: '#6c4436',
          900: '#5c3a30',
          950: '#321d17',
        },
        yellow: {
          50: '#fffbeb',
          100: '#fef5c7',
          200: '#feea8a',
          300: '#fdd84c',
          400: '#fcc620',
          500: '#f0a90a',
          600: '#d18106',
          700: '#ad5a08',
          800: '#8c450e',
          900: '#733a11',
          950: '#421d07',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'input': '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};