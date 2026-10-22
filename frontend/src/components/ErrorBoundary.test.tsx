import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(cleanup);

function ThrowError() {
  throw new Error('테스트 오류');
}

it('에러 발생 시 홈으로 이동 버튼이 표시된다', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  spy.mockRestore();
  expect(screen.getByRole('button', { name: '홈으로 이동' })).toBeInTheDocument();
});
