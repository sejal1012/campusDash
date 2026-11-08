/**
 * Standalone test harness for src/api — does not touch the game.
 *   npx vite --config src/api/test/vite.config.ts
 * Requests to /api are proxied to the hosted backend, so CORS doesn't matter
 * and any port works.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const BACKEND = process.env.BACKEND_URL ?? 'https://ubmon-backend-production.up.railway.app'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Same-origin requests: the proxy below forwards them to the backend.
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('') },
  server: {
    port: 5180,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] },
    proxy: { '/api': { target: BACKEND, changeOrigin: true } },
  },
})
