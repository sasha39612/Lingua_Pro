import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#111218',
        tide: '#0f766e',
        amber: '#f59e0b',
        mist: '#f4f6f8',
      },
      boxShadow: {
        float: '0 20px 60px rgba(17, 18, 24, 0.16)',
      },
      backgroundImage: {
        grain:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};

export default config;
