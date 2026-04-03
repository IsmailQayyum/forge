/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#0e0e10",
          surface: "#18181b",
          border: "#27272a",
          accent: "#f97316",
          "accent-dim": "#431407",
          text: "#fafafa",
          muted: "#71717a",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          red: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
