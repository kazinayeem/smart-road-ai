/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SmartPothole brand tokens (design-system/smartpothole-ai/MASTER.md), shared with the Android app.
        ink: { DEFAULT: '#0B1B33', 900: '#0B1220', 800: '#131C2E', 700: '#1C2740' },
        safety: { DEFAULT: '#C2410C', 400: '#FB923C', 500: '#F97316', 50: '#FFF7ED', 100: '#FFEDD5' },
        route: { DEFAULT: '#0E7490', 300: '#67E8F9', 400: '#22D3EE', 50: '#ECFEFF' },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
