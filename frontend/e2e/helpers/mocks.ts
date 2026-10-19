import type { Page, Route } from '@playwright/test';
import type { LoginResponse } from '../../src/types/auth';
import type { User } from '../../src/types/user';

// 테스트용 계정 픽스처
export const TEST_USERS = {
  guardian: { email: 'guardian@test.com', password: 'Test1234!', role: 'GUARDIAN' as const, id: 101, name: '테스트 보호자' },
  worker:   { email: 'worker@test.com',   password: 'Test1234!', role: 'SUPPORT_WORKER' as const, id: 102, name: '테스트 지원사' },
  agency:   { email: 'institution@test.com', password: 'Test1234!', role: 'INSTITUTION' as const, id: 103, name: '테스트 기관' },
} as const;

type TestUser = typeof TEST_USERS[keyof typeof TEST_USERS];

function ok<T>(data: T) {
  return { success: true, data };
}

function makeUser(u: TestUser): User {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function makeLoginResponse(u: TestUser): LoginResponse {
  return { accessToken: `mock-token-${u.id}`, user: makeUser(u) };
}

// 특정 사용자로 로그인하는 API 응답 모킹
export async function mockLogin(page: Page, user: TestUser) {
  await page.route('**/api/auth/login', (route: Route) =>
    route.fulfill({ json: ok(makeLoginResponse(user)) })
  );
}

// 동의 API 모킹
export async function mockConsent(page: Page) {
  await page.route('**/api/auth/consent', (route: Route) =>
    route.fulfill({ json: ok({ consentTicket: 'mock-ticket-001' }) })
  );
}

// 이메일 회원가입 API 모킹
export async function mockRegister(page: Page, user: TestUser) {
  await page.route('**/api/auth/register', (route: Route) =>
    route.fulfill({ json: ok(makeLoginResponse(user)) })
  );
}

// 돌봄 대상자 목록 모킹
export async function mockRecipients(page: Page) {
  await page.route('**/api/care-recipients', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: ok([{ id: 1, name: '김철수', publicCode: 'P-0001' }]) });
    }
    return route.fulfill({ json: ok({ id: 1, name: '김철수', publicCode: 'P-0001' }) });
  });
}

// 생활기록 목록·생성 모킹
export async function mockRecords(page: Page) {
  await page.route('**/api/care-recipients/*/records*', (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ json: ok({ id: 10, content: '기록 내용', category: 'DAILY_LIFE' }) });
    }
    return route.fulfill({ json: ok({ content: [], pagination: { page: 1, size: 20, totalCount: 0, totalPages: 0 } }) });
  });
}

// 돌봄정보 모킹
export async function mockCareInfo(page: Page) {
  await page.route('**/api/care-recipients/*/care-info*', (route: Route) =>
    route.fulfill({ json: ok([]) })
  );
}

// 기관 정보 모킹
export async function mockOrganization(page: Page) {
  await page.route('**/api/organizations*', (route: Route) =>
    route.fulfill({ json: ok({ id: 1, name: '테스트 기관', code: 'ORG-001', assignments: [] }) })
  );
}

// 알림 목록 모킹
export async function mockNotifications(page: Page) {
  await page.route('**/api/notifications*', (route: Route) =>
    route.fulfill({ json: ok([]) })
  );
}

// 로그인 후 홈까지 이동하는 공유 헬퍼 — 모든 스펙에서 재사용
export async function loginAndGoHome(page: Page, user: TestUser) {
  await mockLogin(page, user);
  await mockRecipients(page);
  await mockRecords(page);
  await mockCareInfo(page);
  await mockNotifications(page);

  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
}
