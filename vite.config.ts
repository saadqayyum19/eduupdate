import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/recharts/') || id.includes('/node_modules/d3-')) return 'charts-vendor';
          if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion-')) return 'motion-vendor';
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router') ||
            id.includes('/node_modules/@remix-run/')
          ) return 'react-vendor';
          if (
            id.includes('/node_modules/@reduxjs/') ||
            id.includes('/node_modules/react-redux/') ||
            id.includes('/node_modules/redux') ||
            id.includes('/node_modules/immer/')
          ) return 'state-vendor';
          if (id.includes('/node_modules/@tanstack/')) return 'query-vendor';
        },
      },
    },
  },
});
