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

let currentRole: string = 'GUARDIAN';
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '사용자', role: currentRole },
  }),
}));

describe('NotificationInboxPage 역할별 알림 확인 및 딥링크 테스트', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('돌봄 보호자(GUARDIAN): 배정 알림 클릭 시 /care-relations로 이동한다', async () => {
    currentRole = 'GUARDIAN';
    const notifs: NotificationItem[] = [
      {
        id: 10,
        type: 'ASSIGNMENT_CHANGED',
        message: '새 활동지원사가 배정되었습니다.',
        read: false,
        createdAt: '2026-10-22T08:00:00Z',
      },
    ];
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: notifs,
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue({ ...notifs[0], read: true });

    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('새 활동지원사가 배정되었습니다.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('새 활동지원사가 배정되었습니다.'));

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith(10, true);
      expect(mockNavigate).toHaveBeenCalledWith('/care-relations');
    });
  });

  it('활동지원사(SUPPORT_WORKER): 정보요청 알림 클릭 시 /record-requests/new로 이동한다', async () => {
    currentRole = 'SUPPORT_WORKER';
    const notifs: NotificationItem[] = [
      {
        id: 20,
        type: 'INFORMATION_REQUEST_RECEIVED',
        message: '정보 요청에 답변이 도착했습니다.',
        read: false,
        createdAt: '2026-10-22T08:00:00Z',
      },
    ];
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: notifs,
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue({ ...notifs[0], read: true });

    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('정보 요청에 답변이 도착했습니다.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('정보 요청에 답변이 도착했습니다.'));

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith(20, true);
      expect(mockNavigate).toHaveBeenCalledWith('/record-requests/new');
    });
  });

  it('기관 담당자(INSTITUTION): 배정/연계 알림 클릭 시 /agency로 이동한다', async () => {
    currentRole = 'INSTITUTION';
    const notifs: NotificationItem[] = [
      {
        id: 30,
        type: 'ORGANIZATION_LINK_REQUESTED',
        message: '보호자가 기관 연계를 요청했습니다.',
        read: false,
        createdAt: '2026-10-22T08:00:00Z',
      },
    ];
    vi.spyOn(notificationApi, 'getNotifications').mockResolvedValue({
      items: notifs,
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    vi.spyOn(notificationApi, 'markNotificationRead').mockResolvedValue({ ...notifs[0], read: true });

    render(
      <MemoryRouter>
        <NotificationInboxPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('보호자가 기관 연계를 요청했습니다.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('보호자가 기관 연계를 요청했습니다.'));

    await waitFor(() => {
      expect(notificationApi.markNotificationRead).toHaveBeenCalledWith(30, true);
      expect(mockNavigate).toHaveBeenCalledWith('/agency');
    });
  });
});
