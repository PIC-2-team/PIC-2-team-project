import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) {
    if (this.open) throw new DOMException('Already open as non-modal', 'InvalidStateError');
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) {
    this.open = false;
  });
});
afterEach(cleanup);

it('open=true일 때 title과 description이 렌더링된다', () => {
  render(<ConfirmDialog open title="삭제할까요?" description="되돌릴 수 없습니다." onConfirm={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByText('삭제할까요?')).toBeInTheDocument();
  expect(screen.getByText('되돌릴 수 없습니다.')).toBeInTheDocument();
});

it('confirmLabel 기본값은 "확인", cancelLabel 기본값은 "취소"다', () => {
  render(<ConfirmDialog open title="확인" onConfirm={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
});

it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog open title="확인" onConfirm={vi.fn()} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(onCancel).toHaveBeenCalledOnce();
});

it('확인 버튼 클릭 시 onConfirm이 호출된다', () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog open title="확인" onConfirm={onConfirm} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it('variant=danger일 때 확인 버튼에 danger 클래스가 있다', () => {
  render(<ConfirmDialog open title="삭제" variant="danger" onConfirm={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByRole('button', { name: '확인' })).toHaveClass('danger');
});

it('닫았다 다시 열어도 모달로 열리고 Escape 취소를 부모에게 전달한다', () => {
  const onCancel = vi.fn();
  const props = { title: '삭제', onConfirm: vi.fn(), onCancel };
  const { rerender } = render(<ConfirmDialog {...props} open />);
  expect(screen.getByRole('alertdialog')).toHaveAttribute('open');
  rerender(<ConfirmDialog {...props} open={false} />);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  rerender(<ConfirmDialog {...props} open />);
  const dialog = screen.getByRole('alertdialog');
  const event = new Event('cancel', { cancelable: true });
  fireEvent(dialog, event);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(true);
});
