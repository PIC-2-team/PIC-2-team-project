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

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
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

