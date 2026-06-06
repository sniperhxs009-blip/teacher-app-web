import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      fontSize: {
        'mobile-xs': ['0.6875rem', { lineHeight: '1rem' }],
        'mobile-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'mobile-base': ['0.9375rem', { lineHeight: '1.5rem' }],
      },
    },
  },
  plugins: [],
};
export default config;
