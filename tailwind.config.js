/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/**/*.html", "./client/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        isbl: {
          accent: "#7c3aed",
          accent2: "#0ea5e9",
          warn: "#dc2626"
        }
      }
    }
  },
  plugins: []
};
