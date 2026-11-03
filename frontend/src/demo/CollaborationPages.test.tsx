import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { Context } from './context';
import { createDemo } from './model';
import { Requests } from './CollaborationPages';

afterEach(cleanup);

function renderRequests(role: 'agency' | 'provider') {
  const state = createDemo();
  state.role = role;
  state.signedIn = true;
  render(
    <MemoryRouter>
      <Context
        value={{
          state,
          send: vi.fn(() => true),
          reset: vi.fn(() => true),
          error: '',
          clearError: vi.fn(),
        }}
      >
        <Requests />
      </Context>
    </MemoryRouter>,
  );
}

it('기관 요청함에서 주의 사항 기록 요청을 보낼 수 없다', () => {
  renderRequests('agency');
  expect(
    screen.queryByRole('link', { name: '주의 사항 기록 요청' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText('주의 사항 기록 요청')).not.toBeInTheDocument();
});

it('활동지원사는 추가 정보 요청을 보낼 수 있다', () => {
  renderRequests('provider');
  expect(screen.getByRole('link', { name: '추가 정보 요청' })).toHaveAttribute(
    'href',
    '/requests/new',
  );
});
