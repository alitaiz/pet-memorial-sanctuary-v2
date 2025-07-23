/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Quicksand', 'serif'],
      },
      colors: {
        'powder-pink': '#FFF0F5',
        'baby-blue': '#E0F7FA',
        'light-beige': '#F5F5DC',
      }
    },
  },
  plugins: [],
}