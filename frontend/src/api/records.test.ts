import { afterEach, expect, it, vi } from 'vitest';
import {
  createRecordDraft,
  deleteRecordMedia,
  uploadRecordAudio,
  createRecordRequest,
  getMyRecordRequests,
  cancelRecordRequest,
  getRecordRevisions,
  getRecordsByMonth,
} from './records';
import { setTokenProvider } from './client';

afterEach(() => {
  vi.restoreAllMocks();
  setTokenProvider(() => null);
});

it('텍스트 AI 초안을 당사자 ID와 함께 요청한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true, data: { transcript: '식사', content: '식사를 했습니다.', category: 'MEAL' },
  })));
  setTokenProvider(() => 'test-token');

  await createRecordDraft(42, { inputType: 'TEXT', text: '점심을 먹었어요.' });

  expect(fetchMock).toHaveBeenCalledWith('/api/ai/record-drafts', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
    body: JSON.stringify({ careRecipientId: 42, inputType: 'TEXT', text: '점심을 먹었어요.' }),
  }));
});

it('오디오를 multipart로 업로드하고 임시 미디어 삭제 API를 호출한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ success: true, data: { mediaId: 9, deleted: true } })));
  setTokenProvider(() => 'test-token');
  const file = new File(['audio'], 'recording.webm', { type: 'audio/webm' });

  await uploadRecordAudio(42, file);
  await deleteRecordMedia(42, 9);

  const [uploadUrl, uploadOptions] = fetchMock.mock.calls[0];
  expect(uploadUrl).toBe('/api/care-recipients/42/media');
  expect(uploadOptions?.method).toBe('POST');
  expect(uploadOptions?.headers).toEqual({ Authorization: 'Bearer test-token' });
  expect(uploadOptions?.body).toBeInstanceOf(FormData);
  const uploadBody = uploadOptions?.body;
  if (!(uploadBody instanceof FormData)) throw new Error('업로드 요청 본문이 FormData가 아닙니다.');
  expect(uploadBody.get('file')).toBe(file);
  const [deleteUrl, deleteOptions] = fetchMock.mock.calls[1];
  expect(deleteUrl).toBe('/api/care-recipients/42/media/9');
  expect(deleteOptions).toEqual(expect.objectContaining({ method: 'DELETE' }));
});

it('활동지원사가 당사자에게 기록 요청을 생성한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true,
    data: {
      id: 1,
      organizationId: 10,
      careRecipientId: 42,
      supportWorkerId: 5,
      idempotencyKey: 'test-key',
      message: '식사 관련 돌봄 내용 수정 부탁드립니다.',
      status: 'PENDING',
      createdAt: '2026-10-21T10:00:00',
    },
  })));
  setTokenProvider(() => 'test-token');

  const res = await createRecordRequest(42, '식사 관련 돌봄 내용 수정 부탁드립니다.', 'test-key');

  expect(res.id).toBe(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/care-recipients/42/record-requests', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }),
    body: JSON.stringify({ idempotencyKey: 'test-key', message: '식사 관련 돌봄 내용 수정 부탁드립니다.' }),
  }));
});

it('본인이 생성한 기록 요청 목록을 조회하고 취소한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      data: [{ id: 1, careRecipientId: 42, status: 'PENDING', message: '요청 1' }],
    })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: null })));
  setTokenProvider(() => 'test-token');

  const list = await getMyRecordRequests();
  expect(list).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledWith('/api/record-requests/mine', expect.any(Object));

  await cancelRecordRequest(42, 1);
  expect(fetchMock).toHaveBeenLastCalledWith('/api/care-recipients/42/record-requests/1/cancel', expect.objectContaining({
    method: 'POST',
  }));
});

it('특정 기록의 수정 이력을 조회한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true,
    data: {
      items: [
        {
          revision: 1,
          changedBy: { id: 3, name: '이활동', role: 'SUPPORT_WORKER' },
          changedAt: '2026-10-22T10:00:00Z',
          content: '점심 식사 시간 30분으로 수정',
          category: 'MEAL',
          recordedAt: '2026-10-22T09:00:00Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    },
  })));
  setTokenProvider(() => 'test-token');

  const res = await getRecordRevisions(42, 100);
  expect(res.items).toHaveLength(1);
  expect(res.items[0].changedBy.name).toBe('이활동');
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/care-recipients/42/records/100/revisions?page=1&pageSize=20',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    })
  );
});

it('카테고리가 전달되면 getRecordsByMonth에 category 쿼리를 포함하여 요청한다', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    success: true,
    data: { items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } },
  })));
  setTokenProvider(() => 'test-token');

  await getRecordsByMonth(42, 2026, 10, 'MEAL');
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/care-recipients/42/records?year=2026&month=10&pageSize=100&category=MEAL',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    })
  );
});
