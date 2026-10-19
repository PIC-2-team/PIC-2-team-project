import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // .env.local의 VITE_API_BASE_URL이 테스트에 영향을 주지 않도록 고정
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
