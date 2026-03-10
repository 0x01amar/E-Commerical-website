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

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.BACKEND_URL': JSON.stringify(
        env.BACKEND_URL || env.VITE_BACKEND_URL || "http://localhost:5000"
      ),
    },
  }
})
