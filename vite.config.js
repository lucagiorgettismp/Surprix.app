import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react()],
  optimizeDeps: {
    entries: ['./src/**/*.{jsx,js}'],
  },
  server: {
    warmup: {
      clientFiles: ['./src/pages/**/*.jsx', './src/components/**/*.jsx'],
    },
  },
})
