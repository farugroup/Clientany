import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb5ff",
          400: "#598bff",
          500: "#3563ff",
          600: "#1f41f5",
          700: "#182fe1",
          800: "#1a29b6",
          900: "#1c2a8f",
          950: "#151a54",
        },
        ink: {
          50: "#f4f6fb",
          100: "#e8ebf6",
          950: "#0a0d1a",
          900: "#0f1424",
          850: "#141a2e",
          800: "#1a2138",
          700: "#242c47",
          600: "#323b5c",
          500: "#4a5578",
          400: "#6b769a",
          300: "#9aa3c0",
          200: "#c5cbdd",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,13,26,0.06), 0 8px 24px rgba(10,13,26,0.06)",
        glow: "0 0 0 1px rgba(53,99,255,0.2), 0 8px 30px rgba(53,99,255,0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        pulse2: "pulse2 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
