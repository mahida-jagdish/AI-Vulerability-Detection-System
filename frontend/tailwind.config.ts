import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: "#334155",
        sea: "#0f766e",
        sand: "#f8fafc",
        ember: "#b45309",
        // Antigravity Theme Colors
        space: {
          900: "#05050A", // Very deep background
          800: "#0D0B14", // Card background
          700: "#1A1625", // Border/Hover
        },
        nebula: {
          400: "#C084FC", // Purple light
          500: "#A855F7", // Purple base
          600: "#9333EA", // Purple dark
          pink: "#EC4899",
          blue: "#3B82F6"
        }
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 3s infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
      }
    }
  },
  plugins: []
};

export default config;

