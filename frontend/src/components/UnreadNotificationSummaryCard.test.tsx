import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as notificationsApi from '../api/notifications';
import { UnreadNotificationSummaryCard } from './UnreadNotificationSummaryCard';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('요청 시 미확인 알림 요약과 개수를 보여준다', async () => {
  const summarize = vi.spyOn(notificationsApi, 'summarizeUnreadNotifications').mockResolvedValue({
    unreadCount: 3,
    summary: '새 기록 2건과 돌봄 관계 변경 1건이 있습니다.',
    generatedAt: '2026-11-01T10:00:00Z',
  });

  render(<UnreadNotificationSummaryCard />);
  fireEvent.click(screen.getByRole('button', { name: '요약 리포트 만들기' }));

  expect(await screen.findByText('새 기록 2건과 돌봄 관계 변경 1건이 있습니다.')).toBeInTheDocument();
  expect(screen.getByText('미확인 알림 3건')).toBeInTheDocument();
  expect(summarize).toHaveBeenCalledOnce();
});

it('미확인 알림이 없으면 빈 상태를 안내한다', async () => {
  vi.spyOn(notificationsApi, 'summarizeUnreadNotifications').mockResolvedValue({
    unreadCount: 0, summary: null, generatedAt: '2026-11-01T10:00:00Z',
  });

  render(<UnreadNotificationSummaryCard />);
  fireEvent.click(screen.getByRole('button', { name: '요약 리포트 만들기' }));

  expect(await screen.findByText('지금은 확인하지 않은 알림이 없어요.')).toBeInTheDocument();
});

it('요약 생성 실패 시 알림을 표시한다', async () => {
  vi.spyOn(notificationsApi, 'summarizeUnreadNotifications').mockRejectedValue(new Error('요약 실패'));

  render(<UnreadNotificationSummaryCard />);
  fireEvent.click(screen.getByRole('button', { name: '요약 리포트 만들기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('요약 리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
});
