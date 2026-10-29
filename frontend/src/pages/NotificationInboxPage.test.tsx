import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationInboxPage } from './NotificationInboxPage';
import * as notificationApi from '../api/notifications';
import type { NotificationItem } from '../types/notification';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '김보호', role: 'GUARDIAN' },
  }),
}));

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    type: 'SUGGESTION_RECEIVED',
    message: '새 생활기록 수정 제안이 도착했습니다.',
    read: false,
    createdAt: '2026-10-22T09:00:00Z',
  },
  {
    id: 2,
    type: 'ASSIGNMENT_CHANGED',
    message: '새 활동지원사가 배정되었습니다.',
    read: true,
    createdAt: '2026-10-21T10:00:00Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationInboxPage />
    </MemoryRouter>
  );
}

describe('NotificationInboxPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('알림 목록을 불러와 렌더링한다', async () => {
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: mockNotifications,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('알림을 불러오는 중입니다');

    await waitFor(() => {
      expect(screen.getByText('새 생활기록 수정 제안이 도착했습니다.')).toBeInTheDocument();
      expect(screen.getByText('새 활동지원사가 배정되었습니다.')).toBeInTheDocument();
    });

    expect(screen.getByText('수정 제안')).toBeInTheDocument();
    expect(screen.getByText('배정')).toBeInTheDocument();
    expect(screen.getByText('새 알림')).toBeInTheDocument();
  });

  it('읽지 않음 탭을 누르면 읽지 않은 알림만 필터링하여 요청한다', async () => {
    const spy = vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: [mockNotifications[0]],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('새 생활기록 수정 제안이 도착했습니다.')).toBeInTheDocument();
    });

    const unreadTab = screen.getByRole('tab', { name: /읽지 않음/ });
    fireEvent.click(unreadTab);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ read: false });
    });
  });

  it('모두 읽음 처리 버튼을 누르면 markAllNotificationsRead를 호출하고 목록을 갱신한다', async () => {
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: mockNotifications,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });
    const markAllSpy = vi.spyOn(notificationApi, 'markAllNotificationsRead').mockResolvedValue({ updatedCount: 1 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '모두 읽음 처리' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '모두 읽음 처리' }));

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalled();
      expect(screen.getByText('모든 알림을 읽음 처리했습니다.')).toBeInTheDocument();
    });
  });

  it('알림 항목을 클릭하면 읽음 처리 후 해당 페이지로 이동한다', async () => {
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: mockNotifications,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });
    const markReadSpy = vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue({
      ...mockNotifications[0],
      read: true,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('새 생활기록 수정 제안이 도착했습니다.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('새 생활기록 수정 제안이 도착했습니다.'));

    await waitFor(() => {
      expect(markReadSpy).toHaveBeenCalledWith(1, true);
      expect(mockNavigate).toHaveBeenCalledWith('/records');
    });
  });

  it('알림이 비어있으면 안내 메시지를 표시한다', async () => {
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('도착한 알림이 없습니다.')).toBeInTheDocument();
    });
  });
});
