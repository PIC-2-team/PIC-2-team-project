import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecordRequestPage } from './RecordRequestPage';
import * as recordsApi from '../api/records';
import * as careRecipientsApi from '../api/careRecipients';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/record-requests/new',
      state: { category: 'MEAL', categoryLabel: '식사' },
    }),
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    selectedRecipientId: 42,
    user: { id: 10, role: 'SUPPORT_WORKER', name: '이지원' },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(careRecipientsApi, 'listCareRecipients').mockResolvedValue([
    { id: 42, name: '김철수' } as any,
  ]);
});

afterEach(() => {
  cleanup();
});

it('화면 진입 시 당사자 이름, 보호자 직통 전달 안내 및 폼이 렌더링된다', async () => {
  render(
    <MemoryRouter>
      <RecordRequestPage />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: '돌봄 내용 수정 요청', level: 1 })).toBeInTheDocument();
  expect(await screen.findByText('김철수님')).toBeInTheDocument();
  expect(screen.getByText('보호자 직통 전달')).toBeInTheDocument();
  expect(screen.getByText(/활동지원사님의 요청은 기관을 거치지 않고 돌봄 보호자에게 다이렉트로 전달됩니다/)).toBeInTheDocument();
  expect(screen.getByText(/\[식사\] 항목 관련 요청/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '수정 요청 내용' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '수정 요청 보내기' })).toBeDisabled();
});

it('요청 내용 입력 시 글자 수가 갱신되고 버튼이 활성화된다', () => {
  render(
    <MemoryRouter>
      <RecordRequestPage />
    </MemoryRouter>
  );

  const textarea = screen.getByRole('textbox', { name: '수정 요청 내용' });
  fireEvent.change(textarea, { target: { value: '점심 식사 시간대를 12시 30분으로 늦추면 좋겠습니다.' } });

  expect(screen.getByText(/31 \/ 500자/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '수정 요청 보내기' })).toBeEnabled();
});

it('요청 내용 제출 시 createRecordRequest API가 호출되고 완료 화면이 표시된다', async () => {
  const createSpy = vi.spyOn(recordsApi, 'createRecordRequest').mockResolvedValue({
    id: 1,
    organizationId: 10,
    careRecipientId: 42,
    supportWorkerId: 10,
    idempotencyKey: 'test-key',
    message: '복약 시간 확인 부탁드립니다.',
    status: 'PENDING',
    createdAt: '2026-10-21T10:00:00',
  });

  render(
    <MemoryRouter>
      <RecordRequestPage />
    </MemoryRouter>
  );

  const textarea = screen.getByRole('textbox', { name: '수정 요청 내용' });
  fireEvent.change(textarea, { target: { value: '복약 시간 확인 부탁드립니다.' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 요청 보내기' }));

  expect(createSpy).toHaveBeenCalledWith(42, '복약 시간 확인 부탁드립니다.');
  expect(await screen.findByRole('heading', { name: '수정 요청을 보냈어요', level: 2 })).toBeInTheDocument();
  expect(screen.getByText(/김철수님의 돌봄 보호자에게 요청이 직접 전달되었습니다/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '새로운 요청 작성' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '보낸 요청 확인' })).toBeInTheDocument();
});

it('API 오류 발생 시 에러 메시지를 표시한다', async () => {
  vi.spyOn(recordsApi, 'createRecordRequest').mockRejectedValue(new Error('현재 배정된 당사자에만 기록 요청을 보낼 수 있습니다.'));

  render(
    <MemoryRouter>
      <RecordRequestPage />
    </MemoryRouter>
  );

  const textarea = screen.getByRole('textbox', { name: '수정 요청 내용' });
  fireEvent.change(textarea, { target: { value: '배정 오류 테스트' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 요청 보내기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('현재 배정된 당사자에만 기록 요청을 보낼 수 있습니다.');
});

it('보낸 요청 내역 탭에서 과거 요청 목록을 조회하고 대기 요청을 취소할 수 있다', async () => {
  vi.spyOn(recordsApi, 'getMyRecordRequests').mockResolvedValue([
    {
      id: 99,
      organizationId: 10,
      careRecipientId: 42,
      supportWorkerId: 10,
      idempotencyKey: 'key-1',
      message: '취소할 요청입니다.',
      status: 'PENDING',
      createdAt: '2026-10-21T10:00:00',
    },
    {
      id: 100,
      organizationId: 10,
      careRecipientId: 42,
      supportWorkerId: 10,
      idempotencyKey: 'key-2',
      message: '이미 완료된 요청입니다.',
      status: 'COMPLETED',
      createdAt: '2026-10-20T10:00:00',
    },
  ]);
  const cancelSpy = vi.spyOn(recordsApi, 'cancelRecordRequest').mockResolvedValue();
  vi.spyOn(window, 'confirm').mockReturnValue(true);

  render(
    <MemoryRouter>
      <RecordRequestPage />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: '보낸 요청 내역' }));

  expect(await screen.findByText('취소할 요청입니다.')).toBeInTheDocument();
  expect(screen.getByText('이미 완료된 요청입니다.')).toBeInTheDocument();
  expect(screen.getByText('검토 대기')).toBeInTheDocument();
  expect(screen.getByText('반영 완료')).toBeInTheDocument();

  const cancelBtn = screen.getByRole('button', { name: '요청 취소' });
  fireEvent.click(cancelBtn);

  await waitFor(() => {
    expect(cancelSpy).toHaveBeenCalledWith(42, 99);
  });
});
