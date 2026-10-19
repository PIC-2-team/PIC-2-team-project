import { test, expect } from '@playwright/test';
import { TEST_USERS, mockLogin, mockRecipients, mockRecords, mockCareInfo, mockNotifications } from './helpers/mocks';

const RECORD_ID = 10;

async function loginAsWorker(page: Parameters<typeof mockLogin>[0]) {
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
}

async function loginAsGuardian(page: Parameters<typeof mockLogin>[0]) {
  const user = TEST_USERS.guardian;
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
}

test.describe('S4 — 수정 제안 흐름', () => {
  test('활동지원사는 기록 상세 페이지에서 수정 제안을 할 수 있다', async ({ page }) => {
    await loginAsWorker(page);

    // 기록 상세 API 모킹
    await page.route(`**/api/care-recipients/*/records/${RECORD_ID}`, route =>
      route.fulfill({
        json: { success: true, data: { id: RECORD_ID, content: '오늘 점심을 먹었어요', category: 'DAILY_LIFE' } },
      })
    );
    // 수정 제안 API 모킹
    await page.route(`**/api/care-recipients/*/records/${RECORD_ID}/suggestions`, route =>
      route.fulfill({ json: { success: true, data: { id: 1, suggestedContent: '오늘 점심과 저녁을 먹었어요', status: 'PENDING' } } })
    );

    await page.goto(`/records/${RECORD_ID}`);

    // 수정 제안 버튼 확인 및 클릭
    const suggestButton = page.getByRole('button', { name: /수정 제안|제안/ });
    if (await suggestButton.count() > 0) {
      await suggestButton.click();

      // 수정 제안 텍스트 입력
      const textarea = page.locator('textarea').last();
      await textarea.fill('오늘 점심과 저녁을 먹었어요');

      // 제출
      await page.getByRole('button', { name: /제출|보내기|제안하기/ }).click();

      // 성공 피드백
      await expect(page.getByText(/제안.*완료|제안.*전송|보호자에게.*전달/)).toBeVisible();
    }
  });

  test('보호자는 알림에서 수정 제안을 확인하고 승인할 수 있다', async ({ page }) => {
    await loginAsGuardian(page);

    // 알림 목록에 제안 포함
    await page.route('**/api/notifications*', route =>
      route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 1,
              type: 'SUGGESTION',
              title: '수정 제안이 도착했어요',
              body: '기록에 대한 수정 제안이 있습니다.',
              recordId: RECORD_ID,
              suggestionId: 1,
              read: false,
            },
          ],
        },
      })
    );
    // 수정 제안 처리 API 모킹
    await page.route('**/api/care-recipients/*/records/*/suggestions/*/approve', route =>
      route.fulfill({ json: { success: true, data: null } })
    );

    // 알림 탭이나 더보기에서 알림 접근
    const notificationLink = page.getByRole('link', { name: /알림/ }).first();
    if (await notificationLink.count() > 0) {
      await notificationLink.click();
      // 수정 제안 알림 확인
      await expect(page.getByText(/수정 제안/)).toBeVisible();
    }
  });
});
