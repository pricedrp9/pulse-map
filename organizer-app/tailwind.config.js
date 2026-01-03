/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        inactive: "#E2E8F0",
        heatmap1: "#DBEAFE",
        heatmap2: "#60A5FA",
        consensus: "#2563EB",
        action: "#1D4ED8",
      },
    },
  },
  plugins: [],
};
