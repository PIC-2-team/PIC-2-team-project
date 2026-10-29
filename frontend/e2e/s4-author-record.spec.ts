import { test, expect, type Page } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, spaNavigate } from './helpers/mocks';

const RECORD_ID = 10;
type RecordUser = typeof TEST_USERS.guardian | typeof TEST_USERS.worker;

async function openRecord(page: Page, user: RecordUser, author: RecordUser) {
  await loginAndGoHome(page, user);

  let content = '오늘 점심을 먹었어요.';
  await page.route(/\/api\/care-recipients\/\d+\/records\/10$/, route => {
    const method = route.request().method();
    if (method === 'DELETE') {
      return route.fulfill({
        json: { success: true, data: { deletedAt: new Date().toISOString(), restoreUntil: new Date(Date.now() + 30 * 86400000).toISOString() } },
      });
    }
    if (method === 'PATCH') {
      content = route.request().postDataJSON().content;
    } else if (method !== 'GET') {
      return route.fallback();
    }
    return route.fulfill({
      json: { success: true, data: { id: RECORD_ID, author: { id: author.id, name: author.name, role: author.role }, content, category: 'MEAL', recordedAt: new Date().toISOString() } },
    });
  });

  await spaNavigate(page, `/records/${RECORD_ID}`);
  await expect(page.getByRole('heading', { name: '기록 상세' })).toBeVisible();
}

test.describe('S4 — 작성자 본인 기록 관리', () => {
  for (const user of [TEST_USERS.guardian, TEST_USERS.worker]) {
    test(`${user.name}는 본인 기록을 수정할 수 있다`, async ({ page }) => {
      await openRecord(page, user, user);
      const updateRequest = page.waitForRequest(request => request.method() === 'PATCH' && request.url().endsWith(`/records/${RECORD_ID}`));

      await page.getByRole('button', { name: '수정', exact: true }).click();
      await page.getByRole('textbox', { name: '기록 내용 수정' }).fill('오늘 점심과 저녁을 먹었어요.');
      await page.getByRole('button', { name: '저장', exact: true }).click();

      expect((await updateRequest).postDataJSON()).toMatchObject({ content: '오늘 점심과 저녁을 먹었어요.' });
      await expect(page.getByText('오늘 점심과 저녁을 먹었어요.')).toBeVisible();
    });

    test(`${user.name}는 본인 기록을 삭제할 수 있다`, async ({ page }) => {
      await openRecord(page, user, user);
      const deleteRequest = page.waitForRequest(request => request.method() === 'DELETE' && request.url().endsWith(`/records/${RECORD_ID}`));

      await page.getByRole('button', { name: '삭제', exact: true }).click();
      await page.getByRole('alertdialog', { name: '기록을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click();

      await deleteRequest;
      await expect(page).toHaveURL('/records');
    });

    test(`${user.name}는 다른 작성자의 기록을 수정·삭제할 수 없다`, async ({ page }) => {
      const author = user.role === 'GUARDIAN' ? TEST_USERS.worker : TEST_USERS.guardian;
      await openRecord(page, user, author);

      await expect(page.getByText('오늘 점심을 먹었어요.')).toBeVisible();
      await expect(page.getByRole('button', { name: '수정', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '삭제', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '수정 제안' })).toHaveCount(0);
    });
  }
});
