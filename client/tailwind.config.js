/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f6efe7",
        burgundy: "#5a1f2f",
        plum: "#3d1f2f",
        rose: "#b77a8f",
        charcoal: "#19171b",
        gold: "#c8a96b",
      },
      boxShadow: {
        soft: "0 24px 60px rgba(25, 23, 27, 0.18)",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

