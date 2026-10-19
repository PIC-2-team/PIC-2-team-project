import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAndGoHome } from './helpers/mocks';

const RECORD_ID = 10;

test.describe('S4 — 수정 제안 흐름', () => {
  test('활동지원사는 기록 상세 페이지에서 수정 제안 버튼을 볼 수 있다', async ({ page }) => {
    await loginAndGoHome(page, TEST_USERS.worker);

    await page.route(`**/api/care-recipients/*/records/${RECORD_ID}`, route =>
      route.fulfill({
        json: { success: true, data: { id: RECORD_ID, content: '오늘 점심을 먹었어요', category: 'DAILY_LIFE' } },
      })
    );

    await page.goto(`/records/${RECORD_ID}`);

    // 수정 제안 버튼이 존재해야 한다 — 없으면 테스트 실패 (조건부 skip 금지)
    await expect(page.getByRole('button', { name: /수정 제안|제안/ })).toBeVisible();
  });

  test('활동지원사는 수정 제안을 작성하고 제출한다', async ({ page }) => {
    await loginAndGoHome(page, TEST_USERS.worker);

    await page.route(`**/api/care-recipients/*/records/${RECORD_ID}`, route =>
      route.fulfill({
        json: { success: true, data: { id: RECORD_ID, content: '오늘 점심을 먹었어요', category: 'DAILY_LIFE' } },
      })
    );
    await page.route(`**/api/care-recipients/*/records/${RECORD_ID}/suggestions`, route =>
      route.fulfill({ json: { success: true, data: { id: 1, suggestedContent: '오늘 점심과 저녁을 먹었어요', status: 'PENDING' } } })
    );

    await page.goto(`/records/${RECORD_ID}`);
    await page.getByRole('button', { name: /수정 제안|제안/ }).click();

    await page.locator('textarea').last().fill('오늘 점심과 저녁을 먹었어요');
    await page.getByRole('button', { name: /제출|보내기|제안하기/ }).click();

    await expect(page.getByText(/제안.*완료|제안.*전송|보호자에게.*전달/)).toBeVisible();
  });

  test.skip('보호자는 알림에서 수정 제안을 승인한다', async ({ page }) => {
    // 알림 센터 → 수정 제안 상세 → 승인 흐름은 알림 UI 구현 완료 후 활성화
    void page;
  });
});
