import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    allowedHosts: [
      'unappropriated-clarisa-unnigh.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io'
    ],
    hmr: {
      clientPort: 443
    }
  }
})