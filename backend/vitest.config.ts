import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '#config': path.resolve(import.meta.dirname, './src/config'),
      '#controllers': path.resolve(import.meta.dirname, './src/controllers'),
      '#middlewares': path.resolve(import.meta.dirname, './src/middlewares'),
      '#routes': path.resolve(import.meta.dirname, './src/routes'),
      '#services': path.resolve(import.meta.dirname, './src/services'),
      '#utils': path.resolve(import.meta.dirname, './src/utils'),
      '#types': path.resolve(import.meta.dirname, './src/types'),
      '#docs': path.resolve(import.meta.dirname, './src/docs'),
    },
  },
});
