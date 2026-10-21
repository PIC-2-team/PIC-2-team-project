import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecordSuggestionsPage } from './RecordSuggestionsPage';
import * as recordsApi from '../api/records';
import * as careRecipientsApi from '../api/careRecipients';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/records', () => ({
  getRecordSuggestions: vi.fn(),
  decideRecordSuggestion: vi.fn(),
}));

vi.mock('../api/careRecipients', () => ({
  listCareRecipients: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    selectedRecipientId: 42,
    user: { id: 1, name: '보호자', role: 'GUARDIAN' },
  }),
}));

const mockRecipient = {
  id: 42,
  name: '김돌봄',
  birthDate: '1990-01-01',
  gender: 'MALE' as const,
  disabilityTypes: ['AUTISM' as const],
  disabilityGrade: 1,
  otherDisabilityType: null,
};

function mockPaginated<T>(items: T[]) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

const mockPendingSuggestions = [
  {
    id: 101,
    recordId: 501,
    original: {
      content: '점심으로 죽을 절반 정도 드셨습니다.',
      category: 'MEAL' as const,
    },
    proposed: {
      content: '점심으로 죽 한 그릇을 모두 드셨습니다.',
      category: 'MEAL' as const,
    },
    reason: '절반이 아니라 한 그릇 완식하셨는데 오기재되었습니다.',
    suggestedBy: {
      id: 2,
      name: '이수진',
      role: 'SUPPORT_WORKER',
    },
    status: 'PENDING' as const,
    createdAt: '2026-10-20T11:30:00Z',
  },
];

const mockApprovedSuggestions = [
  {
    id: 102,
    recordId: 502,
    original: {
      content: '오후 산책 10분 진행',
      category: 'LIFESTYLE' as const,
    },
    proposed: {
      content: '오후 산책 30분 진행 및 스트레칭',
      category: 'LIFESTYLE' as const,
    },
    reason: '산책 시간 상세 기재',
    suggestedBy: {
      id: 2,
      name: '이수진',
      role: 'SUPPORT_WORKER',
    },
    status: 'APPROVED' as const,
    createdAt: '2026-10-19T16:00:00Z',
  },
];

const mockRejectedSuggestions = [
  {
    id: 103,
    recordId: 503,
    original: {
      content: '저녁 약 복용 완료',
      category: 'HEALTH' as const,
    },
    proposed: {
      content: '저녁 약 복용 안 함',
      category: 'HEALTH' as const,
    },
    reason: '약 거부',
    suggestedBy: {
      id: 3,
      name: '박지원',
      role: 'SUPPORT_WORKER',
    },
    status: 'REJECTED' as const,
    createdAt: '2026-10-18T19:00:00Z',
  },
];

describe('RecordSuggestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(careRecipientsApi.listCareRecipients).mockResolvedValue([mockRecipient]);
    vi.mocked(recordsApi.getRecordSuggestions).mockImplementation((_recipientId, status) => {
      if (status === 'PENDING') {
        return Promise.resolve(mockPaginated(mockPendingSuggestions));
      }
      if (status === 'APPROVED') {
        return Promise.resolve(mockPaginated(mockApprovedSuggestions));
      }
      if (status === 'REJECTED') {
        return Promise.resolve(mockPaginated(mockRejectedSuggestions));
      }
      return Promise.resolve(mockPaginated([]));
    });
  });

  afterEach(() => {
    cleanup();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/record-suggestions']}>
        <Routes>
          <Route path="/record-suggestions" element={<RecordSuggestionsPage />} />
          <Route path="/more" element={<div>더보기 페이지</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('기본으로 검토 대기 탭이 선택되고 수정 제안 카드가 렌더링된다', async () => {
    renderPage();

    expect(await screen.findByText('수정 제안 검토')).toBeInTheDocument();
    expect(screen.getByText(/김돌봄/)).toBeInTheDocument();
    expect(screen.getByText('이수진')).toBeInTheDocument();
    expect(screen.getByText('점심으로 죽을 절반 정도 드셨습니다.')).toBeInTheDocument();
    expect(screen.getByText('점심으로 죽 한 그릇을 모두 드셨습니다.')).toBeInTheDocument();
    expect(screen.getByText('절반이 아니라 한 그릇 완식하셨는데 오기재되었습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정 제안 승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정 제안 거절' })).toBeInTheDocument();
  });

  it('승인 버튼을 누르면 API가 호출되고 성공 안내가 표시된다', async () => {
    vi.mocked(recordsApi.decideRecordSuggestion).mockResolvedValue({
      ...mockPendingSuggestions[0],
      status: 'APPROVED',
    });

    renderPage();

    const approveBtn = await screen.findByRole('button', { name: '수정 제안 승인' });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(recordsApi.decideRecordSuggestion).toHaveBeenCalledWith(42, 101, 'APPROVE');
    });

    expect(
      await screen.findByText('수정 제안을 승인하여 생활기록에 반영했습니다.')
    ).toBeInTheDocument();
  });

  it('거절 버튼을 누르면 API가 호출되고 거절 안내가 표시된다', async () => {
    vi.mocked(recordsApi.decideRecordSuggestion).mockResolvedValue({
      ...mockPendingSuggestions[0],
      status: 'REJECTED',
    });

    renderPage();

    const rejectBtn = await screen.findByRole('button', { name: '수정 제안 거절' });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(recordsApi.decideRecordSuggestion).toHaveBeenCalledWith(42, 101, 'REJECT');
    });

    expect(await screen.findByText('수정 제안을 거절했습니다.')).toBeInTheDocument();
  });

  it('처리 완료 탭으로 전환하면 승인/거절 내역과 상태 배지가 표시된다', async () => {
    renderPage();

    const completedTab = await screen.findByRole('tab', { name: '처리 완료' });
    fireEvent.click(completedTab);

    expect(await screen.findByText('오후 산책 30분 진행 및 스트레칭')).toBeInTheDocument();
    expect(screen.getByText('저녁 약 복용 안 함')).toBeInTheDocument();
    expect(screen.getByText('승인됨')).toBeInTheDocument();
    expect(screen.getByText('거절됨')).toBeInTheDocument();
  });

  it('검토 대기 목록이 없을 때 빈 상태 안내가 표시된다', async () => {
    vi.mocked(recordsApi.getRecordSuggestions).mockResolvedValue(mockPaginated([]));

    renderPage();

    expect(
      await screen.findByText('검토 대기 중인 수정 제안이 없습니다.')
    ).toBeInTheDocument();
  });

  it('뒤로 가기 버튼을 누르면 /more로 이동한다', async () => {
    renderPage();

    const backBtn = await screen.findByRole('button', { name: '뒤로 가기' });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/more');
  });
});
