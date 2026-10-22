import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { Context } from './context';
import { createDemo } from './model';
import { Settings } from './HomePages';

afterEach(cleanup);

function renderSettings({
  reset = vi.fn(() => true),
}: {
  reset?: () => boolean;
} = {}) {
  const send = vi.fn(() => true);
  const state = createDemo();
  state.signedIn = true;
  render(
    <MemoryRouter>
      <Context
        value={{
          state,
          send,
          reset,
          error: '',
          clearError: vi.fn(),
        }}
      >
        <Settings />
      </Context>
    </MemoryRouter>,
  );
  return { send, reset };
}

it('설정 페이지에 "예시 데이터 초기화" 버튼이 존재한다', () => {
  renderSettings();
  expect(
    screen.getByRole('button', { name: '예시 데이터 초기화' }),
  ).toBeInTheDocument();
});

it('버튼을 누르면 확인 다이얼로그가 표시된다', () => {
  renderSettings();
  fireEvent.click(screen.getByRole('button', { name: '예시 데이터 초기화' }));
  // 다이얼로그 제목과 AC 명시 문구 확인
  expect(screen.getByText(/모든 변경 사항이 삭제됩니다/)).toBeInTheDocument();
  expect(screen.getByText(/계속하시겠어요/)).toBeInTheDocument();
});

it('취소를 누르면 다이얼로그가 닫히고 reset은 호출되지 않는다', () => {
  const { reset } = renderSettings();
  fireEvent.click(screen.getByRole('button', { name: '예시 데이터 초기화' }));
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(reset).not.toHaveBeenCalled();
  expect(screen.queryByText(/모든 변경 사항이 삭제됩니다/)).not.toBeInTheDocument();
});

it('확인을 누르면 reset()이 호출된다', () => {
  const { reset } = renderSettings();
  fireEvent.click(screen.getByRole('button', { name: '예시 데이터 초기화' }));
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
  expect(reset).toHaveBeenCalledOnce();
});

it('다이얼로그가 열려 있는 동안 초기화 버튼이 비활성화된다', () => {
  renderSettings();
  const initBtn = screen.getByRole('button', { name: '예시 데이터 초기화' });
  fireEvent.click(initBtn);
  expect(initBtn).toBeDisabled();
});

it('reset()이 false를 반환하면 리다이렉트하지 않는다', () => {
  const reset = vi.fn(() => false);
  renderSettings({ reset });
  fireEvent.click(screen.getByRole('button', { name: '예시 데이터 초기화' }));
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
  expect(reset).toHaveBeenCalledOnce();
  // 페이지가 그대로 남아있어야 한다
  expect(screen.getByRole('button', { name: '예시 데이터 초기화' })).toBeInTheDocument();
});
