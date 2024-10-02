import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "X-Frame-Options": "ALLOW-FROM *",
      "Access-Control-Allow-Origin": "*",
    },
  },
});