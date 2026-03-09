import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (server mode)
    port: 5173,
    strictPort: true, // Fail if port is already in use
    allowedHosts: [
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.cfargotunnel.com',
      'localhost',
    ],
    proxy: {
      // Proxy backend API requests to avoid CORS issues
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Twilio webhooks (WhatsApp/SMS) to backend - required when ngrok points to 5173
      '/webhook': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
