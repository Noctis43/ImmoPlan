import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const defaultProxyTarget = 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: defaultProxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: defaultProxyTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
