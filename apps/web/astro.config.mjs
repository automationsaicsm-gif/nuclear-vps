import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    server: {
      proxy: {
        '/api': {
          target: process.env.API_URL || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    define: {
      'import.meta.env.PUBLIC_API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:4000'),
      'import.meta.env.PUBLIC_STRIPE_KEY': JSON.stringify(process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    },
  },
});
