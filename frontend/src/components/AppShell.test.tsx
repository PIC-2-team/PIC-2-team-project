import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { AppShell } from './AppShell';

afterEach(cleanup);

it('역할을 표시하고 큰 글씨를 전환해도 입력 중인 내용을 보존한다', () => {
  render(<MemoryRouter><AppShell role="GUARDIAN"><label>메모<input /></label></AppShell></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '오늘의 기록' } });
  const toggle = screen.getByRole('button', { name: '큰 글씨 모드 전환' });
  expect(screen.getByText('돌봄 보호자')).toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(toggle.closest('.app-shell')).toHaveClass('large-text');
  expect(screen.getByLabelText('메모')).toHaveValue('오늘의 기록');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

it('녹음 또는 저장 중에는 브랜드 링크로 화면을 이탈할 수 없다', () => {
  render(<MemoryRouter><AppShell homeDisabled><p>녹음 중</p></AppShell></MemoryRouter>);
  expect(screen.getByText('삶결')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '삶결' })).not.toBeInTheDocument();
});
