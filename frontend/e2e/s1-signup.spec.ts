import { test, expect } from '@playwright/test';
import { TEST_USERS, mockConsent, mockRegister, mockRecipients, mockRecords, mockCareInfo, mockNotifications } from './helpers/mocks';

test.describe('S1 — 이메일 회원가입 전체 흐름', () => {
  test('동의 → 역할 선택 → 이메일 등록 → 홈 도달', async ({ page }) => {
    const user = TEST_USERS.guardian;

    await mockConsent(page);
    await mockRegister(page, user);
    await mockRecipients(page);
    await mockRecords(page);
    await mockCareInfo(page);
    await mockNotifications(page);

    // 1단계: 동의 페이지 진입
    await page.goto('/consent');
    await expect(page.getByRole('heading', { name: '역할 선택' })).toBeVisible();

    // 2단계: 역할 선택
    await page.getByRole('radio', { name: /돌봄 보호자/ }).click();
    await page.getByRole('button', { name: '다음' }).click();

    // 3단계: 동의 항목 체크 (이용 동의 화면)
    await expect(page.getByRole('heading', { name: '이용 동의' })).toBeVisible();
    for (const checkbox of await page.getByRole('checkbox', { name: /\[필수\]/ }).all()) {
      await checkbox.click();
    }

    // 4단계: 동의 제출
    await page.getByRole('button', { name: '동의하고 시작하기' }).click();

    // 5단계: 회원가입 페이지 도달 (ConsentPage가 state를 포함해 navigate)
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();

    // 6단계: 실제 RegisterPage 폼 필드로 작성 (name 속성 없음 — label 기반 셀렉터 사용)
    await page.getByLabel('이름').fill(user.name);
    await page.getByLabel('이메일').fill(user.email);
    // 비밀번호 두 필드를 placeholder로 구분
    await page.getByPlaceholder('8자 이상 입력').fill(user.password);
    await page.getByPlaceholder('비밀번호를 다시 입력').fill(user.password);

    await page.getByRole('button', { name: '가입하기' }).click();

    // 7단계: 홈 도달
    await expect(page).toHaveURL('/home');
  });

  test('역할 미선택 시 다음 버튼이 비활성화된다', async ({ page }) => {
    await page.goto('/consent');
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  test('필수 동의 미완료 시 제출 버튼이 비활성화된다', async ({ page }) => {
    await page.goto('/consent');
    await page.getByRole('radio', { name: /돌봄 보호자/ }).click();
    await page.getByRole('button', { name: '다음' }).click();

    // 필수 항목 중 첫 번째만 체크 (나머지는 미체크)
    const requiredCheckboxes = await page.getByRole('checkbox', { name: /\[필수\]/ }).all();
    if (requiredCheckboxes.length > 1) {
      await requiredCheckboxes[0].click();
    }

    await expect(page.getByRole('button', { name: '동의하고 시작하기' })).toBeDisabled();
  });

  test('← 역할 다시 선택 버튼으로 역할 선택 단계로 돌아간다', async ({ page }) => {
    await page.goto('/consent');
    await page.getByRole('radio', { name: /활동지원사/ }).click();
    await page.getByRole('button', { name: '다음' }).click();

    await expect(page.getByRole('heading', { name: '이용 동의' })).toBeVisible();
    await page.getByRole('button', { name: /역할 다시 선택/ }).click();
    await expect(page.getByRole('heading', { name: '역할 선택' })).toBeVisible();
  });
});
