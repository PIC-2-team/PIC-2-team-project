import { createContext, useContext, useCallback, useLayoutEffect, useReducer } from 'react';
import type { User } from '../types/user';
import type { GoogleAuthResult, LoginResponse } from '../types/auth';
import * as authApi from '../api/auth';
import { setAccessTokenUpdater, setTokenProvider, setUnauthorizedHandler } from '../api/client';

type State = {
  user: User | null;
  token: string | null;
  selectedRecipientId: number | null;
};

type Action =
  | { type: 'SET'; payload: LoginResponse }
  | { type: 'UPDATE_TOKEN'; token: string }
  | { type: 'CLEAR' }
  | { type: 'SELECT_RECIPIENT'; id: number | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET':
      return { ...state, user: action.payload.user, token: action.payload.accessToken };
    case 'UPDATE_TOKEN':
      return { ...state, token: action.token };
    case 'CLEAR':
      return { user: null, token: null, selectedRecipientId: null };
    case 'SELECT_RECIPIENT':
      return { ...state, selectedRecipientId: action.id };
  }
}

function createInitialState(): State {
  try {
    localStorage.removeItem('sam_token');
    localStorage.removeItem('sam_user');
  } catch {
    // Storage may be unavailable; authentication remains memory-only.
  }
  return { user: null, token: null, selectedRecipientId: null };
}

type AuthCtx = State & {
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<GoogleAuthResult>;
  setAuth: (data: LoginResponse) => void;
  logout: () => void;
  setSelectedRecipient: (id: number | null) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useLayoutEffect(() => {
    setTokenProvider(() => state.token);
    return () => setTokenProvider(() => null);
  }, [state.token]);

  useLayoutEffect(() => {
    setAccessTokenUpdater(token => dispatch({ type: 'UPDATE_TOKEN', token }));
    return () => setAccessTokenUpdater(() => {});
  }, []);

  useLayoutEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch({ type: 'CLEAR' });
    });
    return () => setUnauthorizedHandler(() => {});
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await authApi.login({ email, password });
    dispatch({ type: 'SET', payload: data });
    // 상태 업데이트 전에 반환 — 호출자가 role 즉시 사용 가능
    return data.user;
  };

  const loginWithGoogle = async (idToken: string): Promise<GoogleAuthResult> => {
    const result = await authApi.googleLogin(idToken);
    if (!result.requiresConsent) {
      dispatch({ type: 'SET', payload: { accessToken: result.accessToken, user: result.user } });
    }
    return result;
  };

  const setAuth = (data: LoginResponse) => {
    dispatch({ type: 'SET', payload: data });
  };

  const logout = () => {
    authApi.logout().catch(console.error);
    dispatch({ type: 'CLEAR' });
  };

  const setSelectedRecipient = useCallback((id: number | null) =>
    dispatch({ type: 'SELECT_RECIPIENT', id }), []);

  return (
    <Ctx.Provider value={{ ...state, login, loginWithGoogle, setAuth, logout, setSelectedRecipient }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
