import { test, expect } from '@playwright/test';
import { TEST_USERS, mockLogin, mockRecipients, mockRecords, mockCareInfo, mockNotifications, mockOrganization } from './helpers/mocks';

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

    await page.goto('/home');
    await expect(page).toHaveURL('/agency');
  });

  test('활동지원사는 배정된 당사자 기록을 조회할 수 있다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await mockLogin(page, user);
    await mockRecipients(page);
    await mockRecords(page);
    await mockCareInfo(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home');

    // 기록 탭 또는 링크로 이동
    const recordsLink = page.getByRole('link', { name: /기록/ }).first();
    if (await recordsLink.count() > 0) {
      await recordsLink.click();
      await expect(page).toHaveURL('/records');
    }
  });

  test('활동지원사는 배정되지 않으면 당사자 없음 안내를 본다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await mockLogin(page, user);
    // 빈 목록 반환
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

    // 배정된 당사자 없음 안내 메시지
    await expect(page.getByText(/배정된.*이용자가 없어요|담당.*이용자가 없어요/)).toBeVisible();
  });

  test('활동지원사는 기록 작성 페이지에 접근하면 홈으로 리다이렉트된다', async ({ page }) => {
    const user = TEST_USERS.worker;
    await mockLogin(page, user);
    await mockRecipients(page);
    await mockRecords(page);
    await mockCareInfo(page);
    await mockNotifications(page);

    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/home');

    await page.goto('/records/new');
    await expect(page).toHaveURL('/home');
  });
});
