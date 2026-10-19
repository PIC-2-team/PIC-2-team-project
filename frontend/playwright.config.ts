import { defineConfig } from '@playwright/test';

// CI 포트 충돌 방지: 기본 개발 서버(5173)와 다른 포트 사용
const E2E_PORT = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT) : 5174;
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: E2E_BASE_URL,
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
  },
  projects: [{ name: 'chromium' }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${E2E_PORT} --strictPort`,
        url: E2E_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
