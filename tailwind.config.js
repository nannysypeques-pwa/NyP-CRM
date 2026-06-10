/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7fc',
          100: '#e1eff8',
          200: '#c3dfef',
          300: '#92c7e1',
          400: '#5caad0',
          500: '#388dbb',
          600: '#28719d',
          700: '#215c7f',
          800: '#1e4f6a',
          900: '#1d4359',
          950: '#102b3c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
