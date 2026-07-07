/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        pawn_light: {
          "primary": "#d4af37",
          "secondary": "#262D44",
          "accent": "#f59e0b",
          "neutral": "#1f2937",
          "base-100": "#ffffff",
          "base-200": "#f5f5f5",
          "base-300": "#e5e7eb",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
      },
      "light",
      "dark",
    ],
  },
}
