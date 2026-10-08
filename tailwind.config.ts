import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#000000",
        surface: {
          DEFAULT: "#232525",
          hover: "#2E3030",
        },
        hairline: "#303232",
        content: {
          primary: "#E6E6E6",
          secondary: "#A8A8A8",
          tertiary: "#878787",
        },
        accent: {
          fill: "#002EC1",
          hover: "#1F4BE0",
          pressed: "#0021A0",
          wash: "#0B1A4A",
          blue: "#6C86FF",
          yellow: "#EFF710",
        },
      },
      fontFamily: {
        display: ["var(--font-anton)", "sans-serif"],
        sans: ["var(--font-source-sans-3)", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "0",
      },
      boxShadow: {
        none: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
      },
    },
  },
  plugins: [],
};

export default config;
