import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setTokenProvider } from '../../api/client';
import { ConnectionRequests } from './ConnectionRequests';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
  setTokenProvider(() => 'token');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setTokenProvider(() => null);
});

const linkRequest = {
  id: 11,
  organizationId: 1,
  careRecipientId: 100,
  careRecipientName: '김하늘',
  careRecipientNumber: 'R-ABCD1234',
  requestedById: 5,
  requestedByName: '박보호',
  requestedByPublicCode: 'P-AAAA1111',
  status: 'PENDING',
  requestedAt: '2026-11-03T01:00:00',
  decidedAt: null,
};

const claim = {
  id: 21,
  careRecipientId: 200,
  careRecipientName: '이바다',
  careRecipientNumber: 'R-WXYZ9999',
  guardianId: 6,
  guardianName: '최새로',
  guardianPublicCode: 'P-BBBB2222',
  requestedAt: '2026-11-03T02:00:00',
  expiresAt: '2026-12-03T02:00:00',
};

type Handler = (url: string, method: string) => Response | Promise<Response> | undefined;

function mockApi(handler: Handler = () => undefined, data: { links?: unknown[]; claims?: unknown[] } = {}) {
  const calls: Array<{ url: string; method: string }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    const custom = handler(url, method);
    if (custom) return custom;
    if (url.endsWith('/api/organizations/me/link-requests')) {
      return json(data.links ?? [linkRequest]);
    }
    if (url.endsWith('/api/organizations/me/guardian-claims')) {
      return json(data.claims ?? [claim]);
    }
    return json(null);
  });
  return calls;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data: body }), { status });
}

function failure(status: number, code: string) {
  return new Response(JSON.stringify({ success: false, error: { code, message: code } }), { status });
}

it('보호자의 기관 연결 요청과 이관 당사자 재연결 요청을 누구의 요청인지 알아볼 수 있게 보여 준다', async () => {
  mockApi();

  render(<ConnectionRequests onChanged={vi.fn()} />);

  expect(await screen.findByText('김하늘')).toBeInTheDocument();
  expect(screen.getByText(/R-ABCD1234/)).toBeInTheDocument();
  expect(screen.getByText(/박보호/)).toBeInTheDocument();
  expect(screen.getByText(/P-AAAA1111/)).toBeInTheDocument();
  expect(screen.getByText('이바다')).toBeInTheDocument();
  expect(screen.getByText(/최새로/)).toBeInTheDocument();
  expect(screen.getByText(/2026-12-03/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '연결 요청 (2건)' })).toBeInTheDocument();
});

it('이미 처리된 기관 연결 요청은 목록에서 제외한다', async () => {
  mockApi(() => undefined, { links: [{ ...linkRequest, status: 'ACCEPTED' }], claims: [] });

  render(<ConnectionRequests onChanged={vi.fn()} />);

  expect(await screen.findByText('처리할 연결 요청이 없어요.')).toBeInTheDocument();
  expect(screen.queryByText('김하늘')).not.toBeInTheDocument();
});

it('요청이 없으면 빈 상태를 보여 준다', async () => {
  mockApi(() => undefined, { links: [], claims: [] });

  render(<ConnectionRequests onChanged={vi.fn()} />);

  expect(await screen.findByText('처리할 연결 요청이 없어요.')).toBeInTheDocument();
});

it('두 목록 모두 불러오지 못하면 오류와 다시 불러오기 버튼을 보여 준다', async () => {
  mockApi((url) => (url.endsWith('/link-requests') || url.endsWith('/guardian-claims') ? failure(500, 'INTERNAL') : undefined));

  render(<ConnectionRequests onChanged={vi.fn()} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('연결 요청을 불러오지 못했어요');
  expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
});

it('한쪽 목록만 실패하면 성공한 요청은 그대로 보여 주고 일부 실패를 안내한다', async () => {
  mockApi((url) => (url.endsWith('/guardian-claims') ? failure(500, 'INTERNAL') : undefined));

  render(<ConnectionRequests onChanged={vi.fn()} />);

  expect(await screen.findByText('김하늘')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('일부 요청을 불러오지 못했어요');
  expect(screen.queryByText('이바다')).not.toBeInTheDocument();
});

it('기관 연결 요청을 수락하면 해당 API를 호출하고 목록과 상위 화면을 갱신한다', async () => {
  const onChanged = vi.fn();
  let accepted = false;
  const calls = mockApi(
    (url, method) => {
      if (method === 'POST' && url.endsWith('/api/care-recipients/100/organization-link-requests/11/accept')) {
        accepted = true;
        return json(null);
      }
      if (accepted && url.endsWith('/link-requests')) return json([]);
      return undefined;
    },
  );

  render(<ConnectionRequests onChanged={onChanged} />);
  const item = (await screen.findByText('김하늘')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/organization-link-requests/11/accept'))).toBe(true);
  await waitFor(() => expect(screen.queryByText('김하늘')).not.toBeInTheDocument());
});

it('거절은 확인을 거친 뒤에만 호출한다', async () => {
  const calls = mockApi((_url, method) => (method === 'POST' ? json(null) : undefined));

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('이바다')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '거절' }));

  expect(calls.some((c) => c.method === 'POST')).toBe(false);
  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText(/이바다/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '거절하기' }));

  await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/guardian-claims/21/reject'))).toBe(true));
});

it('재연결 요청을 수락하면 guardian-claims 수락 API를 호출한다', async () => {
  const onChanged = vi.fn();
  const calls = mockApi((_url, method) => (method === 'POST' ? json(null) : undefined));

  render(<ConnectionRequests onChanged={onChanged} />);
  const item = (await screen.findByText('이바다')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/guardian-claims/21/accept'))).toBe(true));
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});

it('이미 처리되었거나 만료된 요청(409)이면 안내하고 목록을 새로 불러온다', async () => {
  let reloaded = 0;
  mockApi((url, method) => {
    if (method === 'POST') return failure(409, 'CLAIM_EXPIRED');
    if (url.endsWith('/guardian-claims')) {
      reloaded += 1;
      return json(reloaded > 1 ? [] : [claim]);
    }
    return undefined;
  });

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('이바다')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('이미 처리되었거나 만료된 요청이에요');
  await waitFor(() => expect(screen.queryByText('이바다')).not.toBeInTheDocument());
});

it('처리 중에는 같은 요청의 버튼을 비활성화해 중복 처리를 막는다', async () => {
  let release: (r: Response) => void = () => {};
  mockApi((_url, method) => (method === 'POST'
    ? new Promise<Response>((resolve) => { release = resolve; })
    : undefined));

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('김하늘')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  await waitFor(() => expect(within(item).getByRole('button', { name: '처리 중…' })).toBeDisabled());
  expect(within(item).getByRole('button', { name: '거절' })).toBeDisabled();
  release(json(null));
});

it('처리가 성공하면 갱신이 끝나기 전에도 처리한 요청은 목록에서 사라지고 다른 요청만 남는다', async () => {
  let reloading = false;
  let releaseReload: (r: Response) => void = () => {};
  mockApi((url, method) => {
    if (method === 'POST') { reloading = true; return json(null); }
    if (reloading && url.endsWith('/link-requests')) return new Promise<Response>((resolve) => { releaseReload = resolve; });
    return undefined;
  });

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('김하늘')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  await waitFor(() => expect(screen.queryByText('김하늘')).not.toBeInTheDocument());
  const other = screen.getByText('이바다').closest('li') as HTMLElement;
  expect(within(other).getByRole('button', { name: '수락' })).toBeDisabled();
  releaseReload(json([]));
  await waitFor(() => expect(within(other).getByRole('button', { name: '수락' })).toBeEnabled());
});

it('처리는 성공했는데 목록 갱신이 실패하면 남은 요청을 유지하고 안내만 보여 준다', async () => {
  let done = false;
  mockApi((url, method) => {
    if (method === 'POST') { done = true; return json(null); }
    if (done && (url.endsWith('/link-requests') || url.endsWith('/guardian-claims'))) return failure(500, 'INTERNAL');
    return undefined;
  });

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('김하늘')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('목록을 새로 불러오지 못했어요');
  expect(screen.getByText('이바다')).toBeInTheDocument();
  expect(screen.queryByText('김하늘')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '다시 불러오기' })).not.toBeInTheDocument();
});

it('거절은 기관의 목록을 바꾸지 않으므로 상위 화면을 다시 불러오게 하지 않는다', async () => {
  const onChanged = vi.fn();
  const calls = mockApi((_url, method) => (method === 'POST' ? json(null) : undefined));

  render(<ConnectionRequests onChanged={onChanged} />);
  const item = (await screen.findByText('이바다')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '거절' }));
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '거절하기' }));

  await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/guardian-claims/21/reject'))).toBe(true));
  await waitFor(() => expect(screen.getAllByRole('button', { name: '수락' })[0]).toBeEnabled());
  expect(onChanged).not.toHaveBeenCalled();
});

it('요청을 찾을 수 없으면(404) 처리된 요청이라고 단정하지 않고 찾을 수 없다고 안내한다', async () => {
  mockApi((_url, method) => (method === 'POST' ? failure(404, 'CLAIM_NOT_FOUND') : undefined));

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('이바다')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '수락' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('요청을 찾을 수 없어요');
  expect(alert).not.toHaveTextContent('이미 처리되었거나 만료');
});

it('당사자 이름이 없으면 목록과 거절 확인에 같은 대체 이름을 쓴다', async () => {
  mockApi(() => undefined, { links: [], claims: [{ ...claim, careRecipientName: null }] });

  render(<ConnectionRequests onChanged={vi.fn()} />);
  const item = (await screen.findByText('이름 없는 당사자')).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: '거절' }));

  expect(within(await screen.findByRole('alertdialog')).getByText('이름 없는 당사자 요청을 거절할까요?')).toBeInTheDocument();
});
