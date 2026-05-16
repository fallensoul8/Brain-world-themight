import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 3000,
    strictPort: false,
  },
  resolve: {
    alias: {
      'agentshire_bridge': resolve(__dirname, 'src/bridge'),
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        town: resolve(__dirname, 'town.html'),
        editor: resolve(__dirname, 'editor.html'),
        preview: resolve(__dirname, 'preview.html'),
        citizenEditor: resolve(__dirname, 'citizen-editor.html'),
      },
    },
  },
})