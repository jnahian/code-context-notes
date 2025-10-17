import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        client: './src/entry-client.tsx'
      }
    }
  },
  ssr: {
    // Prevent externalization of dependencies for SSR
    noExternal: ['react-router-dom']
  }
})