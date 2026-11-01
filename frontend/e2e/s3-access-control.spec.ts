import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, mockLogin, mockRecipients, mockRecords, mockCareInfo, mockNotifications, mockOrganization, spaNavigate } from './helpers/mocks';

test.describe('S3 — 기관 배정 및 접근 제어', () => {
  test('기관 담당자는 로그인 후 /agency로 이동한다', async ({ page }) => {
    const user = TEST_USERS.agency;
    await mockLogin(page, user);
    await mockOrganization(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/agency');
  });

  test('기관 담당자는 /home 접근 시 /agency로 리다이렉트된다', async ({ page }) => {
    const user = TEST_USERS.agency;
    await mockLogin(page, user);
    await mockOrganization(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/agency');

    // auth 상태를 유지하며 SPA 내비게이션
    await spaNavigate(page, '/home');
    await expect(page).toHaveURL('/agency');
  });

  test('활동지원사는 로그인 후 홈에 도달한다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await loginAndGoHome(page, user);
    await expect(page).toHaveURL('/home');
  });

  test('활동지원사는 배정되지 않으면 당사자 없음 안내를 본다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await mockLogin(page, user);
    await page.route('**/api/care-recipients', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ json: { success: true, data: [] } });
      }
      return route.continue();
    });
    await mockRecords(page);
    await mockCareInfo(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home');

    await expect(page.getByText(/배정된.*이용자가 없어요|담당.*이용자가 없어요/)).toBeVisible();
  });

  test('활동지원사는 기록 작성 페이지에서 텍스트 기록을 저장할 수 있다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await loginAndGoHome(page, user);
    await expect(page).toHaveURL('/home');

    let savedContent: string | undefined;
    await page.route(/\/api\/care-recipients\/\d+\/records$/, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      savedContent = route.request().postDataJSON().content;
      return route.fulfill({
        status: 201,
        json: { success: true, data: { id: 10, author: { id: user.id, name: user.name, role: user.role }, content: savedContent, category: 'OTHER', recordedAt: new Date().toISOString() } },
      });
    });
    await spaNavigate(page, '/records/new');
    await expect(page).toHaveURL('/records/new');
    await expect(page.getByRole('heading', { name: '기록 작성' })).toBeVisible();
    await page.getByRole('button', { name: '텍스트로 기록하기' }).click();
    await page.getByRole('textbox', { name: '기록할 내용' }).fill('오늘 산책을 했어요.');
    await page.getByRole('button', { name: '기록하기', exact: true }).click();
    await expect(page).toHaveURL('/records');
    expect(savedContent).toBe('오늘 산책을 했어요.');
  });
});
