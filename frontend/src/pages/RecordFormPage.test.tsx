import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecordFormPage } from './RecordFormPage';
import * as records from '../api/records';

const authState = vi.hoisted(() => ({ user: { role: 'GUARDIAN' } }));

vi.mock('../api/records', () => ({
  createRecord: vi.fn(),
  createRecordDraft: vi.fn(),
  uploadRecordAudio: vi.fn(),
  deleteRecordMedia: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ selectedRecipientId: 42, user: authState.user }) }));

beforeEach(() => {
  authState.user = { role: 'GUARDIAN' };
  localStorage.clear();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/records/new']}>
      <Routes>
        <Route path="/records/new" element={<RecordFormPage />} />
        <Route path="/records" element={<p>기록 목록</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('텍스트를 AI 초안으로 바꾸고 자동 분류를 확인한 뒤 기록을 저장한다', async () => {
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '아침에 밥을 먹었어요.', content: '아침 식사를 했습니다.', category: 'MEAL',
  });
  vi.mocked(records.createRecord).mockResolvedValue({
    id: 8, content: '아침 식사를 했습니다.', category: 'MEAL', recordedAt: '2026-10-15T01:00:00Z',
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '텍스트로 기록하기' }));
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '아침에 밥을 먹었어요.' } });
  fireEvent.click(screen.getByRole('button', { name: '정리하기' }));

  expect(await screen.findByText('이렇게 정리했어요')).toBeInTheDocument();
  expect(screen.getByLabelText('정리된 기록')).toHaveValue('아침 식사를 했습니다.');
  expect(screen.getByText('자동 분류 · 필요하면 바꿀 수 있어요')).toBeInTheDocument();
  expect(screen.queryByText(/AI 분류/)).not.toBeInTheDocument();
  expect(screen.getByText('식사')).toBeInTheDocument();
  await waitFor(() => expect(records.createRecordDraft).toHaveBeenCalledWith(42, {
    inputType: 'TEXT', text: '아침에 밥을 먹었어요.',
  }));
  fireEvent.click(screen.getByRole('button', { name: '기록 저장하기' }));
  await screen.findByText('기록 목록');
  expect(records.createRecord).toHaveBeenCalledWith(42, expect.objectContaining({
    content: '아침 식사를 했습니다.', category: 'MEAL',
  }));
});

it('돌봄정보 함께 표시를 선택하면 고정 기록으로 저장한다', async () => {
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '산책했어요.', content: '오후에 산책을 했습니다.', category: 'LIFESTYLE',
  });
  vi.mocked(records.createRecord).mockResolvedValue({
    id: 9, content: '오후에 산책을 했습니다.', category: 'LIFESTYLE', recordedAt: '2026-10-15T01:00:00Z',
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '텍스트로 기록하기' }));
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '산책했어요.' } });
  fireEvent.click(screen.getByRole('button', { name: '정리하기' }));
  await screen.findByText('이렇게 정리했어요');

  const showInCareInfo = screen.getByRole('checkbox', { name: '돌봄정보에도 표시' });
  expect(showInCareInfo).not.toBeChecked();
  fireEvent.click(showInCareInfo);
  fireEvent.click(screen.getByRole('button', { name: '기록 저장하기' }));

  await screen.findByText('기록 목록');
  expect(records.createRecord).toHaveBeenCalledWith(42, expect.objectContaining({ pinned: true }));
});

it('지원인력은 고정 선택 없이 생활기록을 저장할 수 있다', async () => {
  authState.user = { role: 'SUPPORT_WORKER' };
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '산책했어요.', content: '오후에 산책을 했습니다.', category: 'LIFESTYLE',
  });
  vi.mocked(records.createRecord).mockResolvedValue({
    id: 10, content: '오후에 산책을 했습니다.', category: 'LIFESTYLE', recordedAt: '2026-10-15T01:00:00Z',
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '텍스트로 기록하기' }));
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '산책했어요.' } });
  fireEvent.click(screen.getByRole('button', { name: '정리하기' }));

  await screen.findByText('이렇게 정리했어요');
  expect(screen.queryByRole('checkbox', { name: '돌봄정보에도 표시' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '기록 저장하기' }));

  await screen.findByText('기록 목록');
  expect(records.createRecord).toHaveBeenCalledWith(42, expect.objectContaining({ pinned: false }));
});

it('텍스트 초안 생성에 실패하면 원문을 보존하고 오류를 표시한다', async () => {
  vi.mocked(records.createRecordDraft).mockRejectedValue(new Error('AI 서비스를 사용할 수 없습니다.'));
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: '텍스트로 기록하기' }));
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '관찰한 내용' } });
  fireEvent.click(screen.getByRole('button', { name: '정리하기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('AI 서비스를 사용할 수 없습니다.');
  expect(screen.getByLabelText('기록할 내용')).toHaveValue('관찰한 내용');
});

it('음성을 녹음해 업로드·AI 정리하고 임시 오디오를 정리한다', async () => {
  class MockRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
      this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) } as BlobEvent);
      this.state = 'inactive';
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', MockRecorder);
  const track = { stop: vi.fn() };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
  });
  vi.mocked(records.uploadRecordAudio).mockResolvedValue({ mediaId: 77 });
  vi.mocked(records.deleteRecordMedia).mockResolvedValue({ deleted: true });
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '점심을 먹었어요.', content: '점심 식사를 했습니다.', category: 'MEAL',
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '녹음 시작하기' }));
  fireEvent.click(await screen.findByRole('button', { name: '녹음 마치기' }));
  expect(await screen.findByText('이렇게 정리했어요')).toBeInTheDocument();
  await waitFor(() => {
    expect(records.uploadRecordAudio).toHaveBeenCalledWith(42, expect.any(File));
    expect(records.createRecordDraft).toHaveBeenCalledWith(42, { inputType: 'AUDIO', mediaId: 77 });
    expect(records.deleteRecordMedia).toHaveBeenCalledWith(42, 77);
  });
  expect(track.stop).toHaveBeenCalled();
});

it('마이크 권한 응답을 기다리는 동안 입력 모드 전환을 막는다', async () => {
  class MockRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop?.(); }
  }
  vi.stubGlobal('MediaRecorder', MockRecorder);
  let resolvePermission: (stream: MediaStream) => void = () => {};
  const permission = new Promise<MediaStream>(resolve => { resolvePermission = resolve; });
  const track = { stop: vi.fn() };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(() => permission) },
  });
  const view = renderPage();

  fireEvent.click(screen.getByRole('button', { name: '녹음 시작하기' }));
  expect(await screen.findByRole('button', { name: '마이크 권한 확인 중…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '텍스트로 기록하기' })).toBeDisabled();
  await act(async () => resolvePermission({ getTracks: () => [track] } as unknown as MediaStream));
  expect(await screen.findByRole('button', { name: '녹음 마치기' })).toBeEnabled();
  view.unmount();
  expect(track.stop).toHaveBeenCalled();
});

it('임시 오디오 삭제에 실패하면 사용자에게 알린다', async () => {
  class MockRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
      this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) } as BlobEvent);
      this.state = 'inactive';
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', MockRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  });
  vi.mocked(records.uploadRecordAudio).mockResolvedValue({ mediaId: 78 });
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '간식을 먹었어요.', content: '간식을 먹었습니다.', category: 'MEAL',
  });
  vi.mocked(records.deleteRecordMedia)
    .mockRejectedValueOnce(new Error('정리 실패'))
    .mockResolvedValueOnce({ deleted: true });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '녹음 시작하기' }));
  fireEvent.click(await screen.findByRole('button', { name: '녹음 마치기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('임시 녹음 파일을 삭제하지 못했어요. 다시 시도해 주세요.');
  expect(await screen.findByText('이렇게 정리했어요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '뒤로가기' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '기록 저장하기' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '녹음 파일 삭제 다시 시도' }));
  await waitFor(() => expect(records.deleteRecordMedia).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name: '뒤로가기' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '기록 저장하기' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));
  expect(screen.getByRole('button', { name: '녹음 시작하기' })).toBeEnabled();
  expect(screen.queryByText('임시 녹음 파일을 삭제하지 못했어요. 다시 시도해 주세요.')).not.toBeInTheDocument();
});

it('임시 녹음 정리 중에는 화면을 떠나거나 기록을 중복 제출할 수 없다', async () => {
  class MockRecorder {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
      this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) } as BlobEvent);
      this.state = 'inactive';
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', MockRecorder);
  let resolveDeletion: (response: { deleted: boolean }) => void = () => {};
  const deletion = new Promise<{ deleted: boolean }>(resolve => { resolveDeletion = resolve; });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  });
  vi.mocked(records.uploadRecordAudio).mockResolvedValue({ mediaId: 79 });
  vi.mocked(records.createRecordDraft).mockResolvedValue({
    transcript: '점심을 먹었어요.', content: '점심 식사를 했습니다.', category: 'MEAL',
  });
  vi.mocked(records.deleteRecordMedia).mockReturnValue(deletion);
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '녹음 시작하기' }));
  fireEvent.click(await screen.findByRole('button', { name: '녹음 마치기' }));
  expect(await screen.findByText('이렇게 정리했어요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '임시 녹음 정리 중…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '뒤로가기' })).toBeDisabled();
  await act(async () => resolveDeletion({ deleted: true }));
  expect(screen.getByRole('button', { name: '기록 저장하기' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '뒤로가기' })).toBeEnabled();
});

it('AI 초안 없이 직접 카테고리를 선택하고 내용을 입력해 바로 기록한다', async () => {
  vi.mocked(records.createRecord).mockResolvedValue({
    id: 11, content: '오늘 점심으로 생선구이를 맛있게 먹었습니다.', category: 'MEAL', recordedAt: '2026-10-15T01:00:00Z',
  });
  renderPage();

  fireEvent.click(screen.getByRole('button', { name: '텍스트로 기록하기' }));
  fireEvent.click(screen.getByRole('button', { name: '식사' }));
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '오늘 점심으로 생선구이를 맛있게 먹었습니다.' } });

  const saveBtn = screen.getByRole('button', { name: '기록하기' });
  fireEvent.click(saveBtn);

  await screen.findByText('기록 목록');
  expect(records.createRecordDraft).not.toHaveBeenCalled();
  expect(records.createRecord).toHaveBeenCalledWith(42, expect.objectContaining({
    content: '오늘 점심으로 생선구이를 맛있게 먹었습니다.',
    category: 'MEAL',
    pinned: false,
  }));
});

it('돌봄정보에서 카테고리와 함께 진입 시 해당 카테고리가 기본 선택되고 저장 후 카테고리 상세로 이동한다', async () => {
  vi.mocked(records.createRecord).mockResolvedValue({
    id: 12, content: '저녁 약을 제시간에 복용했습니다.', category: 'HEALTH', recordedAt: '2026-10-15T01:00:00Z',
  });

  render(
    <MemoryRouter initialEntries={[{ pathname: '/records/new', state: { category: 'HEALTH', returnToCareInfo: true } }]}>
      <Routes>
        <Route path="/records/new" element={<RecordFormPage />} />
        <Route path="/care-info/HEALTH" element={<p>건강 상세 페이지</p>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByRole('button', { name: '건강·복약' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('기록할 내용'), { target: { value: '저녁 약을 제시간에 복용했습니다.' } });
  
  const showInCareInfo = screen.getByRole('checkbox', { name: '돌봄정보에도 표시' });
  expect(showInCareInfo).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: '기록하기' }));

  await screen.findByText('건강 상세 페이지');
  expect(records.createRecord).toHaveBeenCalledWith(42, expect.objectContaining({
    content: '저녁 약을 제시간에 복용했습니다.',
    category: 'HEALTH',
    pinned: true,
  }));
});
