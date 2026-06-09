/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#2d1b69',
        'primary-light': '#4a2f8f',
        accent: '#0071e3',
      },
    },
  },
  plugins: [],
}
