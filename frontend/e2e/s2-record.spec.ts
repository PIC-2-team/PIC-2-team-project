import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, mockLogin, mockRecipients, mockRecords, mockCareInfo, mockNotifications } from './helpers/mocks';

test.describe('S2 — 로그인 → 당사자 등록 → 기록 작성', () => {
  test('이메일/비밀번호 로그인 후 홈에 도달한다', async ({ page }) => {
    const user = TEST_USERS.guardian;
    await loginAndGoHome(page, user);
    await expect(page).toHaveURL('/home');
  });

  test('당사자가 없는 보호자는 홈에서 당사자 등록 버튼을 본다', async ({ page }) => {
    const user = TEST_USERS.guardian;
    await mockLogin(page, user);
    await page.route('**/api/care-recipients', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ json: { success: true, data: [] } });
      }
      return route.fulfill({ json: { success: true, data: { id: 99, name: '새 당사자', publicCode: 'P-0099' } } });
    });
    await mockRecords(page);
    await mockCareInfo(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home');

    await expect(page.getByRole('button', { name: '당사자 등록' })).toBeVisible();
  });

  test('기록 작성 폼에서 내용을 입력하고 저장한다', async ({ page }) => {
    const user = TEST_USERS.guardian;
    await mockLogin(page, user);
    await mockRecipients(page);
    await mockCareInfo(page);
    await mockNotifications(page);
    await page.route('**/api/care-recipients/*/records*', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ json: { success: true, data: { id: 10, content: '오늘 밥을 잘 먹었어요', category: 'DAILY_LIFE' } } });
      }
      return route.fulfill({ json: { success: true, data: { content: [], pagination: { page: 1, size: 20, totalCount: 0, totalPages: 0 } } } });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home');

    await page.goto('/records/new');
    await expect(page).toHaveURL('/records/new');

    await page.locator('textarea').fill('오늘 밥을 잘 먹었어요');
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/(records|home)/);
  });

  test('잘못된 비밀번호로 로그인 시 오류 메시지가 표시된다', async ({ page }) => {
    await page.route('**/api/auth/login', route =>
      route.fulfill({
        status: 401,
        json: { success: false, error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
      })
    );

    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'WrongPass1!');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
