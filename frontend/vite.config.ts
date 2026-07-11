import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// During dev, run this separately (npm run dev) and proxy /api to the
// backend (uvicorn --reload on :8000). In production, the built output
// (dist/) is copied into the backend image and served directly by FastAPI.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
