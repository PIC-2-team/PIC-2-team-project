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
  it('기존 localStorage 자격 증명을 복원하지 않고 삭제한다', () => {
    localStorage.setItem('sam_token', 'legacy-token');
    localStorage.setItem('sam_user', JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('sam_token')).toBeNull();
    expect(localStorage.getItem('sam_user')).toBeNull();
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

  it('login() 성공 시 토큰과 유저를 localStorage에 저장하지 않는다', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ accessToken: 'tok', user: mockUser });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      await result.current.login('a@b.com', 'pw');
    });
    expect(localStorage.getItem('sam_token')).toBeNull();
    expect(localStorage.getItem('sam_user')).toBeNull();
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
