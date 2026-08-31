import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Configuracion de Vite. Ademas de compilar los componentes .vue, se define
// un proxy: cualquier request del frontend a "/api/..." se redirige al
// backend en localhost:3000. Asi en el codigo del frontend siempre se pide
// "/api/productos" y no hace falta escribir la URL completa del backend en
// cada llamada.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
