import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: 'https://hernandw.github.io/p-l_calendar_trading/' // Reemplaza con el nombre de tu repositorio
})
