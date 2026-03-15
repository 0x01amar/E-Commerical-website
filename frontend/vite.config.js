import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")

  const explicitBackendUrl = env.VITE_BACKEND_URL || "";
  const devBackendUrl = explicitBackendUrl || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: devBackendUrl,
          changeOrigin: true,
        },
        '/uploads': {
          target: devBackendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
