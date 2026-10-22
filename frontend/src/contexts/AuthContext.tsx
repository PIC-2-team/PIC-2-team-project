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
    case 'SET': {
      try {
        localStorage.setItem('sam_token', action.payload.accessToken);
        localStorage.setItem('sam_user', JSON.stringify(action.payload.user));
      } catch {
        // Storage unavailable
      }
      return { ...state, user: action.payload.user, token: action.payload.accessToken };
    }
    case 'UPDATE_TOKEN': {
      try {
        localStorage.setItem('sam_token', action.token);
      } catch {
        // Storage unavailable
      }
      return { ...state, token: action.token };
    }
    case 'CLEAR': {
      try {
        localStorage.removeItem('sam_token');
        localStorage.removeItem('sam_user');
        localStorage.removeItem('sam_recipient_id');
      } catch {
        // Storage unavailable
      }
      return { user: null, token: null, selectedRecipientId: null };
    }
    case 'SELECT_RECIPIENT': {
      try {
        if (action.id !== null) {
          localStorage.setItem('sam_recipient_id', String(action.id));
        } else {
          localStorage.removeItem('sam_recipient_id');
        }
      } catch {
        // Storage unavailable
      }
      return { ...state, selectedRecipientId: action.id };
    }
  }
}

function createInitialState(): State {
  try {
    const token = localStorage.getItem('sam_token');
    const userStr = localStorage.getItem('sam_user');
    const recipientIdStr = localStorage.getItem('sam_recipient_id');
    const user = userStr ? JSON.parse(userStr) as User : null;
    const selectedRecipientId = recipientIdStr ? Number(recipientIdStr) : null;
    if (token && user) {
      return { user, token, selectedRecipientId };
    }
  } catch {
    // Storage unavailable or JSON parse error
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
