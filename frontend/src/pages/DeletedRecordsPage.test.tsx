import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DeletedRecordsPage } from './DeletedRecordsPage';
import * as recordsApi from '../api/records';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42 }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('본인 삭제 기록을 조회하고 복원하면 목록을 갱신한다', async () => {
  const list = vi.spyOn(recordsApi, 'getDeletedRecords')
    .mockResolvedValueOnce({
      items: [{ id: 7, content: '산책 기록', category: 'LIFESTYLE', recordedAt: '2026-10-14T03:00:00Z',
        deletedAt: '2026-10-14T03:00:00Z', restoreUntil: '2026-11-13T03:00:00Z' }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })
    .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  const restore = vi.spyOn(recordsApi, 'restoreRecord').mockResolvedValue({
    id: 7, content: '산책 기록', category: 'LIFESTYLE', recordedAt: '2026-10-14T03:00:00Z',
  });

  render(<MemoryRouter><DeletedRecordsPage /></MemoryRouter>);
  expect(await screen.findByText('산책 기록')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '복원' }));
  await waitFor(() => expect(restore).toHaveBeenCalledWith(42, 7));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('복원할 수 있는 기록이 없어요.')).toBeInTheDocument();
});
