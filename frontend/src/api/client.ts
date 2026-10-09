import type { ApiResponse } from '../types/common';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`);
  }

  const data = (await res.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new ApiError(data.error.code, data.error.message);
  }

  return data.data;
}
