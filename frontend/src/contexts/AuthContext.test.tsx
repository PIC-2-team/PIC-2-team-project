import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '../api/auth';
import type { User } from '../types/user';

const mockUser: User = { id: 1, name: '김OO', email: 'a@b.com', role: 'GUARDIAN' };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useAuth', () => {
  it('초기 상태 — user null, token null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('login() 성공 시 User를 반환하고 상태가 갱신된다', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      accessToken: 'tok',
      user: mockUser,
    });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    let returned: User | undefined;
    await act(async () => {
      returned = await result.current.login('a@b.com', 'pw');
    });
    expect(returned?.name).toBe('김OO');
    expect(result.current.user?.name).toBe('김OO');
    expect(result.current.token).toBe('tok');
  });

  it('login() 성공 시 localStorage에 토큰과 유저가 저장된다', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ accessToken: 'tok', user: mockUser });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.login('a@b.com', 'pw');
    });
    expect(localStorage.getItem('sam_token')).toBe('tok');
    expect(JSON.parse(localStorage.getItem('sam_user') ?? '{}')).toMatchObject({ id: 1 });
  });

  it('logout() 후 user null + localStorage 정리', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ accessToken: 'tok', user: mockUser });
    vi.spyOn(authApi, 'logout').mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.login('a@b.com', 'pw');
    });
    act(() => {
      result.current.logout();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('sam_token')).toBeNull();
  });

  it('setSelectedRecipient은 selectedRecipientId를 갱신한다', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ accessToken: 'tok', user: mockUser });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.login('a@b.com', 'pw');
    });
    act(() => {
      result.current.setSelectedRecipient(42);
    });
    expect(result.current.selectedRecipientId).toBe(42);
  });
});
