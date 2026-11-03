import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TabBar from './TabBar';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'GUARDIAN' } }),
}));
afterEach(cleanup);

it('미확인 알림이 있어도 더보기 탭에 배지를 표시하지 않는다', () => {
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.queryByLabelText(/안 읽은 알림/)).not.toBeInTheDocument();
});
