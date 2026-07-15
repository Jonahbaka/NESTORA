/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#171916',
        cream: '#f7f4ee',
        coral: '#e75d47',
        forest: '#0f6a56',
        gold: '#b98b3d',
        stone: '#e9e6df',
      },
      boxShadow: {
        soft: '0 18px 60px rgba(23, 25, 22, 0.10)',
        lift: '0 20px 50px rgba(23, 25, 22, 0.16)',
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;
