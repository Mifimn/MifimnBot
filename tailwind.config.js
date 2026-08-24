/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#000000",     // Pure Black
        cardBg: "#000000",     // Pure Black
        borderDark: "#333333", // High-contrast border
        neonGreen: "#00E676",  // Kept for BUY signals
        neonRed: "#FF3D71",    // Kept for SELL signals
      },
    },
  },
  plugins: [],
};
