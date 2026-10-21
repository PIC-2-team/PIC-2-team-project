import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminTabBar } from './AdminTabBar';

afterEach(() => {
  cleanup();
});

it('하단바 탭 메뉴와 전달된 카운트를 올바르게 렌더링한다', () => {
  render(
    <AdminTabBar
      activeTab="dashboard"
      onTabChange={vi.fn()}
      orgCount={5}
      userCount={11}
    />
  );

  expect(screen.getByRole('tab', { name: '대시보드' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: '기관 관리 (5)' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tab', { name: '사용자 목록 (11)' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tab', { name: '더보기' })).toHaveAttribute('aria-selected', 'false');
});

it('탭을 클릭하면 onTabChange 콜백이 호출된다', () => {
  const handleTabChange = vi.fn();
  render(
    <AdminTabBar
      activeTab="dashboard"
      onTabChange={handleTabChange}
      orgCount={3}
      userCount={8}
    />
  );

  fireEvent.click(screen.getByRole('tab', { name: '기관 관리 (3)' }));
  expect(handleTabChange).toHaveBeenCalledWith('organizations');

  fireEvent.click(screen.getByRole('tab', { name: '사용자 목록 (8)' }));
  expect(handleTabChange).toHaveBeenCalledWith('users');

  fireEvent.click(screen.getByRole('tab', { name: '더보기' }));
  expect(handleTabChange).toHaveBeenCalledWith('more');
});
