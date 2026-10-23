import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import * as notificationApi from '../api/notifications';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(cleanup);

it('역할을 표시하고 큰 글씨를 전환해도 입력 중인 내용을 보존한다', async () => {
  vi.spyOn(notificationApi, 'getUnreadNotificationCount').mockResolvedValue(0);
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
  await waitFor(() => {
    expect(screen.getByRole('link', { name: '알림함' })).toBeInTheDocument();
  });
});

it('녹음 또는 저장 중에는 브랜드 링크로 화면을 이탈할 수 없다', () => {
  render(<MemoryRouter><AppShell homeDisabled><p>녹음 중</p></AppShell></MemoryRouter>);
  expect(screen.getByText('삶결')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '삶결' })).not.toBeInTheDocument();
});

it('offline 이벤트 발생 시 네트워크 연결 경고 배너가 표시된다', () => {
  render(<MemoryRouter><AppShell><p>콘텐츠</p></AppShell></MemoryRouter>);
  act(() => { window.dispatchEvent(new Event('offline')); });
  expect(screen.getByRole('alert')).toHaveTextContent('네트워크 연결이 원활하지 않습니다.');
});

it('online 이벤트 발생 시 오프라인 배너가 사라진다', () => {
  render(<MemoryRouter><AppShell><p>콘텐츠</p></AppShell></MemoryRouter>);
  act(() => { window.dispatchEvent(new Event('offline')); });
  act(() => { window.dispatchEvent(new Event('online')); });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('beforeinstallprompt 이벤트 발생 시 홈 화면 추가 배너가 표시된다', () => {
  render(<MemoryRouter><AppShell><p>콘텐츠</p></AppShell></MemoryRouter>);
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
  expect(screen.getByRole('button', { name: /홈 화면에 추가/ })).toBeInTheDocument();
});

it('홈 화면 추가 배너 닫기 클릭 시 배너가 사라진다', () => {
  render(<MemoryRouter><AppShell><p>콘텐츠</p></AppShell></MemoryRouter>);
  act(() => { window.dispatchEvent(new Event('beforeinstallprompt')); });
  fireEvent.click(screen.getByRole('button', { name: /닫기/ }));
  expect(screen.queryByRole('button', { name: /홈 화면에 추가/ })).not.toBeInTheDocument();
});

it('역할이 있을 때 알림함 링크를 렌더링하고 안 읽은 알림이 있으면 배지를 표시한다', async () => {
  vi.spyOn(notificationApi, 'getUnreadNotificationCount').mockResolvedValue(3);
  render(<MemoryRouter><AppShell role="GUARDIAN"><div>본문</div></AppShell></MemoryRouter>);

  const link = screen.getByRole('link', { name: '알림함' });
  expect(link).toHaveAttribute('href', '/notifications');

  await waitFor(() => {
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
