import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAndGoHome, spaNavigate } from './helpers/mocks';

const ok = (data: unknown) => ({ success: true, data });
const record = { id: 10, author: { id: TEST_USERS.guardian.id, name: TEST_USERS.guardian.name, role: 'GUARDIAN' },
  content: '브라우저 기록', category: 'MEAL', recordedAt: '2026-10-22T12:00:00Z' };

test('모달을 닫은 뒤 브라우저 뒤로가기는 이전 페이지로 이동한다', async ({ page }) => {
  await loginAndGoHome(page, TEST_USERS.guardian);
  await page.route(/\/api\/care-recipients\/1\/records\?/, route => route.fulfill({
    json: ok({ items: [record], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } }),
  }));
  await page.route(/\/api\/care-recipients\/1\/records\/10$/, route => route.fulfill({ json: ok(record) }));
  await spaNavigate(page, '/more');
  await spaNavigate(page, '/records?view=list');
  await page.getByRole('link', { name: '브라우저 기록' }).click();
  await expect(page.getByRole('dialog', { name: '기록 상세' })).toBeVisible();
  await page.getByRole('button', { name: '기록 상세 닫기' }).click();
  await expect(page).toHaveURL(/\/records\?view=list$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/more$/);
});

test('저장된 당사자 ID가 만료되어 자동 전환되면 새 기록을 표시한다', async ({ page }) => {
  await loginAndGoHome(page, TEST_USERS.guardian);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sam_recipient_id'))).toBe('1');
  await page.evaluate(() => localStorage.setItem('sam_recipient_id', '99'));
  await page.route('**/api/care-recipients', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ json: ok([{ id: 1, name: '김철수', publicCode: 'P-0001' }]) });
  });
  await page.route(/\/api\/care-recipients\/(99|1)\/records\/10$/, route => {
    if (route.request().url().includes('/99/')) {
      return route.fulfill({ status: 403, json: { success: false, error: { code: 'FORBIDDEN', message: '이전 당사자 접근 오류' } } });
    }
    return route.fulfill({ json: ok(record) });
  });
  await page.goto('/home?record=10');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sam_recipient_id'))).toBe('1');
  await expect(page.getByRole('dialog', { name: '기록 상세' })).toBeVisible();
  await expect(page.getByText('브라우저 기록')).toBeVisible();
});

test('모달을 닫은 뒤 저장 실패가 발생하면 실패를 알린다', async ({ page }) => {
  await loginAndGoHome(page, TEST_USERS.guardian);
  await page.route(/\/api\/care-recipients\/1\/records\/10$/, async route => {
    if (route.request().method() === 'PATCH') {
      await new Promise(resolve => setTimeout(resolve, 300));
      return route.fulfill({ status: 500, json: { success: false, error: { code: 'SAVE_FAILED', message: '저장 실패' } } });
    }
    return route.fulfill({ json: ok(record) });
  });
  await spaNavigate(page, '/records?record=10');
  await expect(page.getByRole('dialog', { name: '기록 상세' })).toBeVisible();
  await page.getByRole('button', { name: '수정', exact: true }).click();
  await page.getByRole('textbox', { name: '기록 내용 수정' }).fill('수정 시도');
  const failedResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/records/10'));
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByRole('button', { name: '기록 상세 닫기' }).click();
  await failedResponse;
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('저장 실패');
});

test('실제 기록 라우트에서 수정 후 목록을 한 번 갱신한다', async ({ page }) => {
  await loginAndGoHome(page, TEST_USERS.guardian);
  let content = '원래 기록';
  let listRequests = 0;
  await page.route(/\/api\/care-recipients\/1\/records\?/, route => {
    listRequests += 1;
    return route.fulfill({ json: ok({
      items: [{ ...record, content }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    }) });
  });
  await page.route(/\/api\/care-recipients\/1\/records\/10$/, route => {
    if (route.request().method() === 'PATCH') content = route.request().postDataJSON().content;
    return route.fulfill({ json: ok({ ...record, content }) });
  });
  await spaNavigate(page, '/records?view=list');
  await expect(page.getByRole('link', { name: '원래 기록' })).toBeVisible();
  const initialRequests = listRequests;
  await page.getByRole('link', { name: '원래 기록' }).click();
  await page.getByRole('button', { name: '수정', exact: true }).click();
  await page.getByRole('textbox', { name: '기록 내용 수정' }).fill('수정된 기록');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect.poll(() => listRequests).toBe(initialRequests + 1);
  await page.getByRole('button', { name: '기록 상세 닫기' }).click();
  await expect(page.getByRole('link', { name: '수정된 기록' })).toBeVisible();
  expect(listRequests).toBe(initialRequests + 1);
});
