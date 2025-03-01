import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true // Opens browser automatically
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
}); 