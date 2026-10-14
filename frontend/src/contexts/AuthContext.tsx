import { createContext, useContext, useEffect, useReducer } from 'react';
import type { User } from '../types/user';
import type { LoginResponse } from '../types/auth';
import * as authApi from '../api/auth';
import { setTokenProvider, setUnauthorizedHandler } from '../api/client';

const TOKEN_KEY = 'sam_token';
const USER_KEY = 'sam_user';

type State = {
  user: User | null;
  token: string | null;
  selectedRecipientId: number | null;
};

type Action =
  | { type: 'SET'; payload: LoginResponse }
  | { type: 'CLEAR' }
  | { type: 'SELECT_RECIPIENT'; id: number | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET':
      return { ...state, user: action.payload.user, token: action.payload.accessToken };
    case 'CLEAR':
      return { user: null, token: null, selectedRecipientId: null };
    case 'SELECT_RECIPIENT':
      return { ...state, selectedRecipientId: action.id };
  }
}

function loadFromStorage(): State {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw) {
      const user = JSON.parse(raw) as User;
      if (user.id && user.role) return { user, token, selectedRecipientId: null };
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return { user: null, token: null, selectedRecipientId: null };
}

type AuthCtx = State & {
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setSelectedRecipient: (id: number | null) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage);

  useEffect(() => {
    setTokenProvider(() => state.token);
  }, [state.token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      dispatch({ type: 'CLEAR' });
    });
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    dispatch({ type: 'SET', payload: data });
    // 상태 업데이트 전에 반환 — 호출자가 role 즉시 사용 가능
    return data.user;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    dispatch({ type: 'CLEAR' });
  };

  const setSelectedRecipient = (id: number | null) =>
    dispatch({ type: 'SELECT_RECIPIENT', id });

  return (
    <Ctx.Provider value={{ ...state, login, logout, setSelectedRecipient }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
