import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, API calls are forwarded to the backend on port 3000.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: { outDir: 'dist', sourcemap: false },
});
