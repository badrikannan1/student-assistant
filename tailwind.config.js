module.exports = {
  darkMode: 'class', // or 'media' if you prefer OS-level aettings
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          background: '#111827', // Equivalent to gray-900
          foreground: '#F3F4F6', // Equivalent to gray-100
          card: '#1F2937',       // Equivalent to gray-800
          'card-foreground': '#F3F4F6', // Equivalent to gray-100
          primary: '#3B82F6',    // Equivalent to blue-500
          'primary-foreground': '#FFFFFF', // White
          border: '#374151',    // Equivalent to gray-700
          muted: '#4B5563',     // Equivalent to gray-600
          'muted-foreground': '#D1D5DB', // Equivalent to gray-300
        }
      }
    },
  },
  plugins: [],
}