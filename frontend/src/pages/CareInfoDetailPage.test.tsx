import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import CareInfoDetailPage from './CareInfoDetailPage';
import * as recordsApi from '../api/records';
import * as careInfoApi from '../api/careInfo';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockRole = 'GUARDIAN';
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ selectedRecipientId: 42, user: { role: mockRole } }),
}));

beforeEach(() => {
  mockRole = 'GUARDIAN';
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

it('식사(MEAL) 카테고리 진입 시 중요 기록과 전체 기록을 분류하여 표시한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({
    items: [
      { id: 1, content: '점심 식사로 된장국을 잘 먹었습니다.', category: 'MEAL', recordedAt: '2026-10-19T03:00:00Z', pinned: true } as any,
      { id: 2, content: '아침 식사 후 간식을 섭취했습니다.', category: 'MEAL', recordedAt: '2026-10-19T01:00:00Z', pinned: false } as any,
    ],
    pagination: { page: 1, pageSize: 50, totalItems: 2, totalPages: 1 },
  });
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockResolvedValue({
    category: 'MEAL',
    content: '식사 전 손 씻기를 좋아합니다.',
    updatedAt: '2026-10-19T00:00:00Z',
  });

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes>
        <Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: '식사', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('식사 전 손 씻기를 좋아합니다.')).toBeInTheDocument();
  // 핀된 기록은 중요 정보 섹션 + 전체 기록 섹션 둘 다 표시됨
  expect(screen.getAllByText('점심 식사로 된장국을 잘 먹었습니다.').length).toBeGreaterThan(0);
  expect(screen.getByText('아침 식사 후 간식을 섭취했습니다.')).toBeInTheDocument();
  expect(screen.getByText('📌 중요 정보')).toBeInTheDocument();
  expect(screen.getByText('전체 기록 (2)')).toBeInTheDocument();
});

it('보호자가 핀 토글 클릭 시 pinRecord API를 호출하고 고정 상태를 반영한다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({
    items: [
      { id: 10, content: '식사 기록 내용', category: 'MEAL', recordedAt: '2026-10-19T03:00:00Z', pinned: false } as any,
    ],
    pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
  });
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockRejectedValue(new Error('Not found'));
  const pinSpy = vi.spyOn(recordsApi, 'pinRecord').mockResolvedValue({} as any);

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes>
        <Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByText('식사 기록 내용');
  const pinButton = screen.getByRole('button', { name: '중요 정보로 고정' });
  fireEvent.click(pinButton);

  expect(pinSpy).toHaveBeenCalledWith(42, 10, true);
});

it('기록하기 클릭 시 /records/new 경로로 카테고리 state를 넘긴다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
  });
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockRejectedValue(new Error('Not found'));

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes>
        <Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const addButton = await screen.findByRole('button', { name: /기록하기/ });
  fireEvent.click(addButton);

  expect(mockNavigate).toHaveBeenCalledWith('/records/new', { state: { category: 'MEAL', returnToCareInfo: true } });
});

it('전체 기록이 5개 초과이면 처음 5개만 표시하고 더 보기 버튼이 나타난다', async () => {
  const items = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    content: `기록 ${i + 1}`,
    category: 'MEAL',
    recordedAt: '2026-10-19T03:00:00Z',
    pinned: false,
  }));
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({ items } as any);
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockRejectedValue(new Error('not found'));

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes><Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} /></Routes>
    </MemoryRouter>
  );

  await screen.findByText('기록 1');

  expect(screen.getByText('기록 5')).toBeInTheDocument();
  expect(screen.queryByText('기록 6')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /더 보기/ })).toBeInTheDocument();
});

it('전체 기록 더 보기 클릭 시 모든 기록이 표시된다', async () => {
  const items = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    content: `기록 ${i + 1}`,
    category: 'MEAL',
    recordedAt: '2026-10-19T03:00:00Z',
    pinned: false,
  }));
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({ items } as any);
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockRejectedValue(new Error('not found'));

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes><Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} /></Routes>
    </MemoryRouter>
  );

  await screen.findByText('기록 1');
  fireEvent.click(screen.getByRole('button', { name: /더 보기/ }));

  expect(screen.getByText('기록 7')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument();
});

it('활동지원사는 돌봄 내용 수정 요청 버튼이 표시되고 클릭 시 /record-requests/new로 이동한다', async () => {
  mockRole = 'SUPPORT_WORKER';
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
  });
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockRejectedValue(new Error('Not found'));

  render(
    <MemoryRouter initialEntries={['/care-info/MEAL']}>
      <Routes>
        <Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.queryByRole('button', { name: /기록하기/ })).not.toBeInTheDocument();
  const requestButton = await screen.findByRole('button', { name: /돌봄 내용 수정 요청/ });
  fireEvent.click(requestButton);

  expect(mockNavigate).toHaveBeenCalledWith('/record-requests/new', {
    state: { category: 'MEAL', categoryLabel: '식사' },
  });
});

it('잘못된 카테고리에서 정상 카테고리로 이동해도 Hook 순서가 유지된다', async () => {
  vi.spyOn(recordsApi, 'getRecordsByCategory').mockResolvedValue({
    items: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
  });
  vi.spyOn(careInfoApi, 'getCareInfoByCategory').mockResolvedValue({ category: 'MEAL', content: '', updatedAt: null });
  render(<MemoryRouter initialEntries={['/care-info/INVALID']}>
    <Link to="/care-info/MEAL">정상 카테고리로 이동</Link>
    <Routes><Route path="/care-info/:categoryId" element={<CareInfoDetailPage />} /></Routes>
  </MemoryRouter>);
  expect(screen.getByText('존재하지 않는 카테고리입니다.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: '정상 카테고리로 이동' }));
  expect(await screen.findByRole('heading', { name: '식사', level: 1 })).toBeInTheDocument();
});
