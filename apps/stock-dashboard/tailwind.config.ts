import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        morandi: {
          green: '#8FA895',
          beige: '#E5DCC3',
          sage: '#A8B5A0',
          cream: '#F5F1E8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
