import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, setTokenProvider, setUnauthorizedHandler } from './client';

beforeEach(() => {
  setTokenProvider(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
  setTokenProvider(() => null);
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

  it('path 앞에 BASE_URL이 붙는다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/api/path');
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/path$/);
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
