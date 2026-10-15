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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const token = _getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
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
