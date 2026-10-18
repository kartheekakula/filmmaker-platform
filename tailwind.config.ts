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
          DEFAULT: "#1C1E1E",
          card: "#232525",
          hover: "#2B2D2D",
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
        logo: ["var(--font-pixelify-sans)", "monospace", "sans-serif"],
        heading: ["var(--font-archivo-black)", "Impact", "Arial Black", "sans-serif"],
        display: ["var(--font-archivo-black)", "Impact", "Arial Black", "sans-serif"],
        serif: ["var(--font-archivo-black)", "Impact", "Arial Black", "sans-serif"],
        sans: ["var(--font-zilla-slab)", "Georgia", "Cambria", "serif"],
        body: ["var(--font-zilla-slab)", "Georgia", "Cambria", "serif"],
        mono: ["var(--font-zilla-slab)", "Georgia", "Cambria", "serif"],
      },
      fontWeight: {
        semibold: "500",
      },
      borderRadius: {
        none: "0px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "28px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
