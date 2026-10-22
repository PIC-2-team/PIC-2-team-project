import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TabBar from './TabBar';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'GUARDIAN' } }),
}));
afterEach(cleanup);

it('unreadCount > 0 이면 더보기 탭에 배지가 표시된다', () => {
  render(<MemoryRouter><TabBar unreadCount={3} /></MemoryRouter>);
  expect(screen.getByLabelText(/안 읽은 알림 3개/)).toBeInTheDocument();
});

it('unreadCount가 0이면 배지가 표시되지 않는다', () => {
  render(<MemoryRouter><TabBar unreadCount={0} /></MemoryRouter>);
  expect(screen.queryByLabelText(/안 읽은 알림/)).not.toBeInTheDocument();
});
