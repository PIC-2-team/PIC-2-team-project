import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WithdrawPage } from './WithdrawPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let mockRole = 'GUARDIAN';
const mockLogout = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: '홍길동', email: 'a@b.c', role: mockRole }, logout: mockLogout }),
}));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  mockRole = 'GUARDIAN';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockNavigate.mockClear();
  mockLogout.mockClear();
});

type Preview = {
  recipients: Array<{ careRecipientId: number; name: string; resolution: 'SUCCESSION' | 'CHOICE' | 'DELETE_ONLY' }>;
  endedAssignmentCount: number;
};

const guardianPreview: Preview = {
  recipients: [
    { careRecipientId: 1, name: '김승계', resolution: 'SUCCESSION' },
    { careRecipientId: 2, name: '이선택', resolution: 'CHOICE' },
    { careRecipientId: 3, name: '박삭제', resolution: 'DELETE_ONLY' },
  ],
  endedAssignmentCount: 0,
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

function failure(status: number, code: string) {
  return new Response(JSON.stringify({ success: false, error: { code, message: code } }), { status });
}

type Handler = (url: string, method: string, body: string | undefined) => Response | Promise<Response> | undefined;

function mockApi(preview: Preview | Response, handler: Handler = () => undefined) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? init.body : undefined;
    calls.push({ url, method, body });
    const custom = handler(url, method, body);
    if (custom) return custom;
    if (url.endsWith('/api/users/me/withdrawal-preview')) return preview instanceof Response ? preview.clone() : json(preview);
    if (method === 'DELETE' && url.endsWith('/api/users/me')) return new Response(null, { status: 204 });
    return json(null);
  });
  return calls;
}

function renderPage() {
  return render(<MemoryRouter><WithdrawPage /></MemoryRouter>);
}

function submitButton() {
  return screen.getByRole('button', { name: '탈퇴하기' });
}

it('뒤로가기는 직접 열었을 때도 갈 곳이 있도록 더보기로 이동한다', async () => {
  mockApi({ recipients: [], endedAssignmentCount: 0 });

  renderPage();
  fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

  expect(mockNavigate).toHaveBeenCalledWith('/more');
  await waitFor(() => expect(submitButton()).toBeEnabled());
});

it('당사자별로 처리 방식을 카드로 보여 준다', async () => {
  mockApi(guardianPreview);

  renderPage();

  const succession = (await screen.findByText('김승계')).closest('li') as HTMLElement;
  expect(within(succession).getByText(/세컨드 보호자가 이어받아요/)).toBeInTheDocument();
  expect(within(succession).queryByRole('radio')).not.toBeInTheDocument();

  const choice = screen.getByText('이선택').closest('li') as HTMLElement;
  expect(within(choice).getByRole('radio', { name: /기관에 이관/ })).not.toBeChecked();
  expect(within(choice).getByRole('radio', { name: /삭제/ })).not.toBeChecked();

  const onlyDelete = screen.getByText('박삭제').closest('li') as HTMLElement;
  expect(within(onlyDelete).getByText(/연결된 기관이 없어/)).toBeInTheDocument();
  expect(within(onlyDelete).getByRole('checkbox')).not.toBeChecked();
});

it('선택해야 하는 당사자의 결정이 없으면 탈퇴할 수 없다', async () => {
  mockApi(guardianPreview);

  renderPage();
  await screen.findByText('이선택');

  expect(submitButton()).toBeDisabled();
  fireEvent.click(within(screen.getByText('이선택').closest('li') as HTMLElement).getByRole('radio', { name: /기관에 이관/ }));
  expect(submitButton()).toBeDisabled();
  fireEvent.click(within(screen.getByText('박삭제').closest('li') as HTMLElement).getByRole('checkbox'));
  expect(submitButton()).toBeEnabled();
});

it('선택을 마치고 마지막 확인을 거치면 결정 목록을 보내고 로그아웃한다', async () => {
  const calls = mockApi(guardianPreview);

  renderPage();
  await screen.findByText('이선택');
  fireEvent.click(within(screen.getByText('이선택').closest('li') as HTMLElement).getByRole('radio', { name: /기관에 이관/ }));
  fireEvent.click(within(screen.getByText('박삭제').closest('li') as HTMLElement).getByRole('checkbox'));
  fireEvent.click(submitButton());

  const dialog = await screen.findByRole('alertdialog');
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  expect(within(dialog).getByText(/되돌릴 수 없/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(mockLogout).toHaveBeenCalledOnce());
  const withdraw = calls.find((c) => c.method === 'DELETE')!;
  expect(JSON.parse(withdraw.body!)).toEqual({
    decisions: [
      { careRecipientId: 2, action: 'TRANSFER' },
      { careRecipientId: 3, action: 'DELETE' },
    ],
  });
  expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
});

it('마지막 확인에서 취소하면 탈퇴 요청을 보내지 않는다', async () => {
  const calls = mockApi({ recipients: [], endedAssignmentCount: 0 });

  renderPage();
  await waitFor(() => expect(submitButton()).toBeEnabled());
  fireEvent.click(submitButton());
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }));

  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  expect(mockLogout).not.toHaveBeenCalled();
});

it('당사자가 없는 보호자는 선택 없이 바로 탈퇴할 수 있고 결정 목록은 비어 있다', async () => {
  const calls = mockApi({ recipients: [], endedAssignmentCount: 0 });

  renderPage();
  await waitFor(() => expect(submitButton()).toBeEnabled());
  fireEvent.click(submitButton());
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  expect(JSON.parse(calls.find((c) => c.method === 'DELETE')!.body!)).toEqual({ decisions: [] });
});

it('활동지원사에게는 종료되는 활성 배정 수를 경고한다', async () => {
  mockRole = 'SUPPORT_WORKER';
  mockApi({ recipients: [], endedAssignmentCount: 3 });

  renderPage();

  expect(await screen.findByText(/활성 배정 3건이 종료돼요/)).toBeInTheDocument();
  expect(screen.queryByText(/기관 코드/)).not.toBeInTheDocument();
});

it('기관 담당자에게는 배정 종료와 기관 코드 변경을 경고한다', async () => {
  mockRole = 'INSTITUTION';
  mockApi({ recipients: [], endedAssignmentCount: 2 });

  renderPage();

  expect(await screen.findByText(/활성 배정 2건이 종료돼요/)).toBeInTheDocument();
  expect(screen.getByText(/기관 코드가 새로 바뀌어요/)).toBeInTheDocument();
});

it('결정이 서버 상태와 어긋나면(422) 안내하고 미리보기를 다시 불러와 선택을 처음부터 받는다', async () => {
  let previews = 0;
  mockApi(guardianPreview, (url, method) => {
    if (method === 'DELETE') return failure(422, 'WITHDRAWAL_DECISION_INVALID');
    if (url.endsWith('/withdrawal-preview')) { previews += 1; }
    return undefined;
  });

  renderPage();
  await screen.findByText('이선택');
  fireEvent.click(within(screen.getByText('이선택').closest('li') as HTMLElement).getByRole('radio', { name: /기관에 이관/ }));
  fireEvent.click(within(screen.getByText('박삭제').closest('li') as HTMLElement).getByRole('checkbox'));
  fireEvent.click(submitButton());
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '탈퇴하기' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('당사자 정보가 바뀌었어요');
  await waitFor(() => expect(previews).toBe(2));
  expect(mockLogout).not.toHaveBeenCalled();
  await waitFor(() => expect(within(screen.getByText('이선택').closest('li') as HTMLElement).getByRole('radio', { name: /기관에 이관/ })).not.toBeChecked());
});

it('미리보기를 불러오지 못하면 오류와 다시 불러오기를 보여 주고 탈퇴를 막는다', async () => {
  mockApi(failure(500, 'INTERNAL'));

  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent('탈퇴 정보를 불러오지 못했어요');
  expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '탈퇴하기' })).not.toBeInTheDocument();
});

it('탈퇴 처리 중에는 버튼을 막아 중복 요청을 방지한다', async () => {
  let release: (r: Response) => void = () => {};
  const calls = mockApi({ recipients: [], endedAssignmentCount: 0 }, (_url, method) =>
    method === 'DELETE' ? new Promise<Response>((resolve) => { release = resolve; }) : undefined);

  renderPage();
  await waitFor(() => expect(submitButton()).toBeEnabled());
  fireEvent.click(submitButton());
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByRole('button', { name: '처리 중…' })).toBeDisabled());
  expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(1);
  release(new Response(null, { status: 204 }));
  await waitFor(() => expect(mockLogout).toHaveBeenCalled());
});
