import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el sitio funciona en GitHub Pages (subruta /<repo>/) y abierto desde disco.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
