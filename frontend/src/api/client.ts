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
let _onUnauthorized: (() => void) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const token = _getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(resolveUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : isFormData ? options.body as FormData : JSON.stringify(options.body),
  });

  if (res.status === 401) {
    _onUnauthorized?.();
    throw new ApiError('UNAUTHORIZED', '인증이 만료됐어요.', 401);
  }

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
