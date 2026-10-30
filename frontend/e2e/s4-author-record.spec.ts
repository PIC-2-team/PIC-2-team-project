import { test, expect, type Page } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, spaNavigate } from './helpers/mocks';

const RECORD_ID = 10;
type RecordUser = typeof TEST_USERS.guardian | typeof TEST_USERS.worker;

async function openRecord(page: Page, user: RecordUser, author: RecordUser, largeText = false) {
  await loginAndGoHome(page, user);
  if (largeText) await page.getByRole('button', { name: '큰 글씨 모드 전환' }).click();

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

  await spaNavigate(page, `/records?record=${RECORD_ID}`);
  await expect(page.getByRole('heading', { name: '기록 상세' })).toBeVisible();
}

test.describe('S4 — 작성자 본인 기록 관리', () => {
  test('기록 모달에서 줄바꿈과 큰 글씨 모드가 유지된다', async ({ page }) => {
    await openRecord(page, TEST_USERS.guardian, TEST_USERS.guardian, true);
    const content = page.getByRole('dialog', { name: '기록 상세' }).locator('.record-content');
    await expect(content).toHaveCSS('white-space', 'pre-wrap');
    await expect(content).toHaveCSS('font-size', '18px');
  });

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

    test(`${user.name}는 본인이 삭제한 기록을 목록에서 복원할 수 있다`, async ({ page }) => {
      await openRecord(page, user, user);
      let restored = false;
      await page.route(/\/api\/care-recipients\/\d+\/records\?/, route => route.fulfill({
        json: { success: true, data: { items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } } },
      }));
      await page.route(/\/api\/care-recipients\/\d+\/records\/deleted\?/, route => route.fulfill({
        json: { success: true, data: {
          items: restored ? [] : [{ id: RECORD_ID, content: '오늘 점심을 먹었어요.', category: 'MEAL',
            recordedAt: new Date().toISOString(), deletedAt: new Date().toISOString(),
            restoreUntil: new Date(Date.now() + 30 * 86400000).toISOString() }],
          pagination: { page: 1, pageSize: 20, totalItems: restored ? 0 : 1, totalPages: restored ? 0 : 1 },
        } },
      }));
      await page.route(/\/api\/care-recipients\/\d+\/records\/10\/restore$/, route => {
        restored = true;
        return route.fulfill({ json: { success: true, data: { id: RECORD_ID } } });
      });

      await page.getByRole('button', { name: '삭제', exact: true }).click();
      await page.getByRole('alertdialog', { name: '기록을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click();
      await expect(page).toHaveURL('/records');
      await page.getByRole('link', { name: '삭제된 기록 보기' }).click();
      await expect(page.getByText('오늘 점심을 먹었어요.')).toBeVisible();
      const restoreRequest = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith(`/records/${RECORD_ID}/restore`));
      await page.getByRole('button', { name: '복원' }).click();
      await restoreRequest;
      await expect(page.getByText('복원할 수 있는 기록이 없어요.')).toBeVisible();
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
