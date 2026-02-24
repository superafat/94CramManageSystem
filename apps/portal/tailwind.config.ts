import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        morandi: {
          green: '#A8B5A2',
          pink: '#C4A9A1',
          blue: '#9CADB7',
          purple: '#A89BB5',
          cream: '#E8DDD3',
          gray: '#B5AFA6',
          bg: '#F5F1EC',
        },
      },
    },
  },
  plugins: [],
};

export default config;
