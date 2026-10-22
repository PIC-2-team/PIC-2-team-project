import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecordDetailPage } from './RecordDetailPage';
import * as recordsApi from '../api/records';
import type { DailyRecord } from '../types/record';

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

const sampleRecord: DailyRecord = {
  id: 101,
  content: '오늘 점심에 밥을 맛있게 먹었어요.',
  category: 'MEAL',
  recordedAt: '2026-10-22T12:00:00Z',
};

beforeEach(() => {
  mockRole = 'GUARDIAN';
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

it('기록 상세 정보를 정상적으로 렌더링한다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심에 밥을 맛있게 먹었어요.')).toBeInTheDocument();
  expect(screen.getByText('식사')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
});

it('보호자가 수정 버튼을 누르면 수정 모드로 전환되고 저장 시 updateRecord가 호출된다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  const updateSpy = vi.spyOn(recordsApi, 'updateRecord').mockResolvedValue({
    ...sampleRecord,
    content: '수정된 기록 내용입니다.',
    category: 'LIFESTYLE',
  });

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: '수정' });
  fireEvent.click(editBtn);

  // 수정 모드 진입 확인
  expect(screen.getByRole('heading', { name: '기록 수정', level: 1 })).toBeInTheDocument();
  const textarea = screen.getByRole('textbox', { name: '기록 내용 수정' });
  expect(textarea).toHaveValue('오늘 점심에 밥을 맛있게 먹었어요.');

  // 카테고리 변경 (생활습관)
  const lifestyleChip = screen.getByRole('button', { name: '생활습관' });
  fireEvent.click(lifestyleChip);
  expect(lifestyleChip).toHaveAttribute('aria-pressed', 'true');

  // 내용 수정
  fireEvent.change(textarea, { target: { value: '수정된 기록 내용입니다.' } });

  // 저장 클릭
  const saveBtn = screen.getByRole('button', { name: '저장' });
  fireEvent.click(saveBtn);

  await waitFor(() => {
    expect(updateSpy).toHaveBeenCalledWith(42, 101, {
      content: '수정된 기록 내용입니다.',
      category: 'LIFESTYLE',
    });
  });

  // 수정 완료 후 상세 뷰로 복귀 및 갱신 확인
  expect(await screen.findByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('기록이 수정되었어요.')).toBeInTheDocument();
  expect(screen.getByText('수정된 기록 내용입니다.')).toBeInTheDocument();
  expect(screen.getByText('생활습관')).toBeInTheDocument();
});

it('수정 모드에서 취소 버튼 클릭 시 수정이 취소되고 원래 내용이 유지된다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const editBtn = await screen.findByRole('button', { name: '수정' });
  fireEvent.click(editBtn);

  const textarea = screen.getByRole('textbox', { name: '기록 내용 수정' });
  fireEvent.change(textarea, { target: { value: '취소할 내용' } });

  const cancelBtn = screen.getByRole('button', { name: '취소' });
  fireEvent.click(cancelBtn);

  expect(screen.getByRole('heading', { name: '기록 상세', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('오늘 점심에 밥을 맛있게 먹었어요.')).toBeInTheDocument();
  expect(screen.queryByText('취소할 내용')).not.toBeInTheDocument();
});

it('활동지원사로 진입 시 수정 제안 버튼이 노출된다', async () => {
  mockRole = 'SUPPORT_WORKER';
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('button', { name: '수정 제안' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
});

it('보호자가 삭제 버튼을 누르고 확인하면 deleteRecord 호출 후 목록으로 이동한다', async () => {
  vi.spyOn(recordsApi, 'getRecord').mockResolvedValue(sampleRecord);
  const deleteSpy = vi.spyOn(recordsApi, 'deleteRecord').mockResolvedValue({
    deletedAt: '2026-10-22T12:30:00Z',
    restoreUntil: '2026-11-21T12:30:00Z',
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);

  render(
    <MemoryRouter initialEntries={['/records/101']}>
      <Routes>
        <Route path="/records/:id" element={<RecordDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  const deleteBtn = await screen.findByRole('button', { name: '삭제' });
  fireEvent.click(deleteBtn);

  await waitFor(() => {
    expect(deleteSpy).toHaveBeenCalledWith(42, 101);
    expect(mockNavigate).toHaveBeenCalledWith('/records', { replace: true });
  });
});
