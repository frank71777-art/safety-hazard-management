/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        port: {
          blue: '#1a5fb4',
          ink: '#1f2937',
          steel: '#eef2f7',
          amber: '#f59e0b',
          green: '#16a34a',
          red: '#dc2626'
        }
      }
    }
  },
  plugins: []
};

export default config;
