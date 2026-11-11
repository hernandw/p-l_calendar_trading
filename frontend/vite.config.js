import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: 'https://github.com/hernandw/p-l_calendar_trading', // Reemplaza con el nombre exacto de tu repo en GitHub
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      // Configuración estándar sin dependencias experimentales de Rolldown
    }
  }
});