/** @type {import('tailwindcss').Config} */
// Keep in sync with theme/tokens.ts (BUILD_SPEC section 7).
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#C48A5A",
        accent: "#E0883C",
        success: "#16A34A",
        outgoing: "#EF4444",
        star: "#F5B301",
        ink: "#1A1A1A",
        muted: "#6B7280",
        background: "#FFFFFF",
        "background-alt": "#F9FAFB",
        border: "#E5E7EB",
      },
      borderRadius: {
        "2xl": "16px",
        xl: "12px",
      },
    },
  },
  plugins: [],
};
