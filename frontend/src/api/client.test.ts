import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, setAccessTokenUpdater, setTokenProvider, setUnauthorizedHandler } from './client';

beforeEach(() => {
  setTokenProvider(() => null);
  setAccessTokenUpdater(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  setTokenProvider(() => null);
  setAccessTokenUpdater(() => {});
});

describe('apiRequest', () => {
  it('성공 응답에서 data를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { id: 1 } }), { status: 200 })
      )
    );
    const result = await apiRequest<{ id: number }>('/api/test');
    expect(result).toEqual({ id: 1 });
  });

  it('success: false 응답에서 ApiError를 throw한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '없음' } }),
          { status: 200 }
        )
      )
    );
    await expect(apiRequest('/api/test')).rejects.toThrow(ApiError);
  });

  it('success: false 응답의 ApiError는 code를 포함한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '없음' } }),
          { status: 200 }
        )
      )
    );
    try {
      await apiRequest('/api/test');
      expect.fail('throw 되어야 함');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe('NOT_FOUND');
    }
  });

  it('HTTP 5xx 응답에서 ApiError를 throw한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      )
    );
    await expect(apiRequest('/api/test')).rejects.toThrow(ApiError);
  });

  it('POST 요청 시 body를 JSON으로 직렬화한다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/api/test', { method: 'POST', body: { key: 'value' } });
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe(JSON.stringify({ key: 'value' }));
  });

  it('API 요청은 현재 도메인의 상대 경로를 사용한다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/api/path');
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/path');
  });

  it('VITE_API_BASE_URL이 HTTPS URL이면 절대 경로로 요청한다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.com');
    vi.resetModules();
    const { apiRequest: testRequest } = await import('./client');
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);

    await testRequest('/api/auth/consent');

    expect(mockFetch.mock.calls[0][0]).toBe('https://backend.example.com/api/auth/consent');
  });

  it.each([
    [''],
    ['http://localhost:8080'],
  ])('VITE_API_BASE_URL이 "%s"이면 상대 경로로 요청한다', async baseUrl => {
    vi.stubEnv('VITE_API_BASE_URL', baseUrl);
    vi.resetModules();
    const { apiRequest: testRequest } = await import('./client');
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);

    await testRequest('/api/auth/consent');

    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/consent');
  });

  it('토큰이 있으면 Authorization 헤더를 포함한다', async () => {
    setTokenProvider(() => 'test-token-abc');
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest<{ ok: boolean }>('/test');
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-abc');
  });

  it('토큰이 없으면 Authorization 헤더를 포함하지 않는다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/test');
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('401 응답 시 onUnauthorized 콜백을 호출한다', async () => {
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '' } }),
          { status: 401 }
        )
      )
    );
    await expect(apiRequest('/protected')).rejects.toThrow(ApiError);
    expect(onUnauth).toHaveBeenCalled();
  });

  it('401 응답이면 refresh cookie로 토큰을 갱신하고 원 요청을 한 번 재시도한다', async () => {
    setTokenProvider(() => 'expired-token');
    const updateToken = vi.fn();
    const onUnauth = vi.fn();
    setAccessTokenUpdater(updateToken);
    setUnauthorizedHandler(onUnauth);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true, data: { accessToken: 'fresh-token' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true, data: { id: 8 },
      }), { status: 201 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiRequest<{ id: number }>('/api/care-recipients/42/records', {
      method: 'POST', body: { content: '기록' },
    })).resolves.toEqual({ id: 8 });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect(mockFetch.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'POST', credentials: 'include',
    }));
    expect(mockFetch.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: 'POST', body: JSON.stringify({ content: '기록' }),
    }));
    expect((mockFetch.mock.calls[2][1] as RequestInit).headers)
      .toEqual(expect.objectContaining({ Authorization: 'Bearer fresh-token' }));
    expect(updateToken).toHaveBeenCalledWith('fresh-token');
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('실제 권한 부족 403은 토큰 갱신 없이 오류로 반환한다', async () => {
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      success: false, error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' },
    }), { status: 403 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiRequest('/api/care-recipients/42/records', { method: 'POST' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('동시에 만료된 요청은 토큰 갱신을 한 번만 공유한다', async () => {
    setTokenProvider(() => 'expired-token');
    let resolveRefresh: (response: Response) => void = () => {};
    let refreshCalls = 0;
    const requestCalls = new Map<string, number>();
    const refreshResponse = new Promise<Response>(resolve => { resolveRefresh = resolve; });
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === '/api/auth/refresh') {
        refreshCalls += 1;
        return refreshResponse;
      }
      if (input === '/first' || input === '/second') {
        const count = (requestCalls.get(input) ?? 0) + 1;
        requestCalls.set(input, count);
        return Promise.resolve(count === 1
          ? new Response('', { status: 401 })
          : new Response(JSON.stringify({ success: true, data: input }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: input }), { status: 200 }));
    });
    vi.stubGlobal('fetch', mockFetch);

    const requests = [apiRequest('/first'), apiRequest('/second')];
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(refreshCalls).toBe(1);
    resolveRefresh(new Response(JSON.stringify({
      success: true, data: { accessToken: 'fresh-token' },
    }), { status: 200 }));
    await expect(Promise.all(requests)).resolves.toEqual(['/first', '/second']);
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('갱신 완료 뒤 늦게 도착한 401은 이미 갱신된 토큰으로만 재시도한다', async () => {
    let token = 'expired-token';
    setTokenProvider(() => token);
    setAccessTokenUpdater(nextToken => { token = nextToken; });
    let resolveLateResponse: (response: Response) => void = () => {};
    let refreshCalls = 0;
    const lateResponse = new Promise<Response>(resolve => { resolveLateResponse = resolve; });
    const requestCalls = new Map<string, number>();
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      if (input === '/api/auth/refresh') {
        refreshCalls += 1;
        return Promise.resolve(new Response(JSON.stringify({
          success: true, data: { accessToken: 'fresh-token' },
        }), { status: 200 }));
      }
      const path = String(input);
      const count = (requestCalls.get(path) ?? 0) + 1;
      requestCalls.set(path, count);
      if (path === '/late' && count === 1) return lateResponse;
      if (path === '/fast' && count === 1) return Promise.resolve(new Response('', { status: 401 }));
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: path }), { status: 200 }));
    });
    vi.stubGlobal('fetch', mockFetch);

    const lateRequest = apiRequest('/late');
    await expect(apiRequest('/fast')).resolves.toBe('/fast');
    resolveLateResponse(new Response('', { status: 401 }));
    await expect(lateRequest).resolves.toBe('/late');

    expect(refreshCalls).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('refresh 실패 후 원 요청을 재시도하지 않고 인증 만료 처리를 한다', async () => {
    setTokenProvider(() => 'expired-token');
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiRequest('/protected')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('401 ApiError는 status 401을 포함한다', async () => {
    setUnauthorizedHandler(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response('', { status: 401 })
      )
    );
    try {
      await apiRequest('/protected');
      expect.fail('throw 되어야 함');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
  });
});
