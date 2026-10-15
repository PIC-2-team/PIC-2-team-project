import { afterEach, expect, it, vi } from 'vitest';
import { createRecordDraft, deleteRecordMedia, uploadRecordAudio } from './records';
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
