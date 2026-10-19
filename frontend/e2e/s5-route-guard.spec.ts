import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, mockLogin, mockOrganization, mockNotifications } from './helpers/mocks';

test.describe('S5 — 역할별 라우트 보호', () => {
  test('미인증 상태에서 /home 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 상태에서 /records 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/records');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 상태에서 /agency 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/agency');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 상태에서 /admin 접근 시 /login으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('SUPPORT_WORKER는 /records/new에 접근하면 /home으로 리다이렉트된다', async ({ page }) => {
    await loginAndGoHome(page, TEST_USERS.worker);
    await expect(page).toHaveURL('/home');

    await page.goto('/records/new');
    await expect(page).toHaveURL('/home');
  });

  test('INSTITUTION은 /home 접근 시 /agency로 리다이렉트된다', async ({ page }) => {
    const user = TEST_USERS.agency;
    await mockLogin(page, user);
    await mockOrganization(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/agency');

    await page.goto('/home');
    await expect(page).toHaveURL('/agency');
  });

  test('로그인 후 원래 접근하려던 페이지로 돌아간다 (?redirect 파라미터)', async ({ page }) => {
    // 미인증 상태에서 /home 접근 → /login?redirect=/home 으로 이동
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login.*redirect/);

    await loginAndGoHome(page, TEST_USERS.guardian);
    await expect(page).toHaveURL('/home');
  });
});
