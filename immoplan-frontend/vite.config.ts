import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const defaultProxyTarget = 'http://127.0.0.1:3000'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ''), '')
  const proxyTarget = env.VITE_PROXY_TARGET || defaultProxyTarget

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
