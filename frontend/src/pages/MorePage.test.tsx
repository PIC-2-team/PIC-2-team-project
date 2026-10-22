import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MorePage } from './MorePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUser: { id: number; name: string; email: string; role: string } | null = {
  id: 1,
  name: '홍길동',
  email: 'worker@test.com',
  role: 'SUPPORT_WORKER',
};

let mockSelectedRecipientId: number | null = null;
let mockLogout = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    selectedRecipientId: mockSelectedRecipientId,
  }),
}));

beforeEach(() => {
  mockUser = {
    id: 1,
    name: '홍길동',
    email: 'worker@test.com',
    role: 'SUPPORT_WORKER',
  };
  mockSelectedRecipientId = null;
  mockLogout = vi.fn();
  mockNavigate.mockClear();
  vi.clearAllMocks();
});


afterEach(() => {
  cleanup();
});

it('활동지원사 로그인 시 돌봄 협업 섹션과 돌봄 내용 수정 요청 메뉴가 표시된다', () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  expect(screen.getByText('활동지원사')).toBeInTheDocument();
  expect(screen.getByText('돌봄 협업')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /돌봄 내용 수정 요청/ })).toBeInTheDocument();
});

it('돌봄 내용 수정 요청 클릭 시 /record-requests/new 경로로 이동한다', () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const requestMenu = screen.getByRole('button', { name: /돌봄 내용 수정 요청/ });
  fireEvent.click(requestMenu);

  expect(mockNavigate).toHaveBeenCalledWith('/record-requests/new');
});

it('돌봄 보호자 로그인 시 돌봄 협업 섹션이 표시되지 않는다', () => {
  mockUser = {
    id: 2,
    name: '김보호',
    email: 'guardian@test.com',
    role: 'GUARDIAN',
  };

  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  expect(screen.getByText('돌봄 보호자')).toBeInTheDocument();
  expect(screen.queryByText('돌봄 협업')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /돌봄 내용 수정 요청/ })).not.toBeInTheDocument();
});

it('프로필 아바타 원을 클릭하면 당사자 프로필 모달이 열리고 당사자 정보가 표시된다', async () => {
  mockSelectedRecipientId = 42;
  const careRecipientsApi = await import('../api/careRecipients');

  vi.spyOn(careRecipientsApi, 'getCareRecipient').mockResolvedValue({
    id: 42,
    name: '김당사',
    careRecipientNumber: 'REC-2026-0001',
    birthDate: '2010-05-15',
    gender: 'MALE',
    disabilityGrade: 1,
  });

  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const avatarBtn = screen.getByRole('button', { name: '돌봄 대상자 프로필 보기' });
  fireEvent.click(avatarBtn);

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('돌봄 대상자 프로필')).toBeInTheDocument();
  expect(await screen.findByText('김당사 님')).toBeInTheDocument();
  expect(screen.getByText(/REC-2026-0001/)).toBeInTheDocument();
  expect(screen.getByText(/2010-05-15/)).toBeInTheDocument();
  expect(screen.getByText(/1급/)).toBeInTheDocument();

  // 닫기 버튼 클릭
  const closeBtn = screen.getByRole('button', { name: '닫기' });
  fireEvent.click(closeBtn);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('로그아웃 버튼을 클릭하면 로그아웃 확인 다이얼로그를 표시한다', async () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const logoutBtn = screen.getByRole('button', { name: '로그아웃' });
  fireEvent.click(logoutBtn);

  expect(await screen.findByText('로그아웃할까요?')).toBeInTheDocument();
  expect(screen.getByText('로그아웃 후 다시 로그인해야 합니다.')).toBeInTheDocument();
});

it('다이얼로그 취소 버튼을 클릭하면 로그아웃하지 않는다', async () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const logoutBtn = screen.getByRole('button', { name: '로그아웃' });
  fireEvent.click(logoutBtn);

  const cancelBtn = await screen.findByRole('button', { name: '취소' });
  fireEvent.click(cancelBtn);

  expect(mockLogout).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

it('다이얼로그 확인 버튼을 클릭하면 로그아웃을 실행한다', async () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const logoutBtn = screen.getByRole('button', { name: '로그아웃' });
  fireEvent.click(logoutBtn);

  // 두 개의 로그아웃 버튼이 있으므로 정확히 선택
  const logoutButtons = screen.getAllByRole('button', { name: '로그아웃' });
  fireEvent.click(logoutButtons[logoutButtons.length - 1]); // 다이얼로그의 로그아웃 버튼

  expect(mockLogout).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
});

it('사용자 이름/역할 영역을 클릭하면 사용자 프로필 모달이 열린다', async () => {
  render(
    <MemoryRouter>
      <MorePage />
    </MemoryRouter>
  );

  const profileBtn = screen.getByRole('button', { name: '내 프로필 정보 보기' });
  fireEvent.click(profileBtn);

  expect(await screen.findByRole('heading', { name: /활동지원사 정보/ })).toBeInTheDocument();
  expect(screen.getByText('홍길동 님')).toBeInTheDocument();
  expect(screen.getAllByText('worker@test.com').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
});
