/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fresh Sage & White Palette
        primaryGreen: '#347A59',
        deepGreen: '#244B39',
        sage: '#83B89A',
        mint: '#DCEFE3',
        mainBg: '#F4F8F5',
        cardBg: '#FFFFFF',
        borderSage: '#E5ECE7',
        bodyText: '#647568',

        brand: {
          50: '#F4F8F5',
          100: '#DCEFE3',
          200: '#B8DFCA',
          300: '#83B89A',
          400: '#539773',
          500: '#347A59', // Primary Green
          600: '#2C644A',
          700: '#244B39', // Deep Green
          800: '#1D3B2D',
          900: '#152A20',
        },
        slate: {
          50: '#F4F8F5',
          100: '#244B39', // Deep Green
          200: '#244B39', // Deep Green
          300: '#244B39', // Deep Green
          400: '#647568', // Body Text
          500: '#647568', // Body Text
          600: '#83B89A', // Sage
          700: '#DCEFE3', // Mint
          800: '#E5ECE7', // Border
          850: '#E5ECE7',
          900: '#FFFFFF', // Cards Pure White
          950: '#F4F8F5', // Main Background
        },
        dark: {
          800: '#DCEFE3',
          900: '#FFFFFF',
          950: '#F4F8F5',
        },
        emerald: {
          50: '#F4F8F5',
          100: '#DCEFE3', // Mint
          200: '#C2E5D0',
          300: '#83B89A', // Sage
          400: '#347A59', // Primary Green
          500: '#347A59', // Primary Green
          600: '#244B39', // Deep Green
          700: '#1D3B2D',
          800: '#152A20',
          900: '#DCEFE3',
          950: '#F4F8F5',
        }
      }
    },
  },
  plugins: [],
}
