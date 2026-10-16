import type { ApiResponse } from '../types/common';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

let _getToken: () => string | null = () => null;
let _tokenOverride: string | null | undefined;
let _updateAccessToken: (token: string) => void = () => {};
let _onUnauthorized: (() => void) | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
  _tokenOverride = undefined;
}

export function setAccessTokenUpdater(fn: (token: string) => void) {
  _updateAccessToken = fn;
}

export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

const PROD_BACKEND = 'https://backend-production-51de.up.railway.app';

function resolveUrl(path: string): string {
  const vercelEnv = import.meta.env.VITE_VERCEL_ENV as string | undefined;
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

  if (vercelEnv === 'preview') {
    const isUsable =
      apiBase.startsWith('https://') && !apiBase.startsWith(PROD_BACKEND);
    if (!isUsable) {
      throw new ApiError('PREVIEW_BACKEND_NOT_CONFIGURED', 'Preview 백엔드 주소가 설정되지 않았습니다.');
    }
    return `${apiBase}${path}`;
  }

  return path;
}

function currentToken() {
  return _tokenOverride === undefined ? _getToken() : _tokenOverride;
}

function refreshAccessToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = (async () => {
      try {
        const response = await fetch(resolveUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) return null;
        const json = (await response.json()) as ApiResponse<{ accessToken: string }>;
        if (!json.success || !json.data.accessToken) return null;
        _tokenOverride = json.data.accessToken;
        _updateAccessToken(json.data.accessToken);
        return json.data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

async function sendRequest(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(resolveUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isFormData ? options.body as FormData : JSON.stringify(options.body),
    credentials: 'include',
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`, res.status);
  }

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, res.status);
  }

  return json.data;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = currentToken();
  let res = await sendRequest(path, options, token);

  if (res.status === 401) {
    const latestToken = currentToken();
    const refreshedToken = token && latestToken && latestToken !== token
      ? latestToken
      : token ? await refreshAccessToken() : null;
    if (refreshedToken) res = await sendRequest(path, options, refreshedToken);
    if (!refreshedToken || res.status === 401) {
      _tokenOverride = null;
      _onUnauthorized?.();
      throw new ApiError('UNAUTHORIZED', '인증이 만료됐어요.', 401);
    }
  }

  return parseResponse<T>(res);
}
