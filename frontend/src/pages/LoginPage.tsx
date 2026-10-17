import { AppShell } from '../components/AppShell';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api/client';
import styles from './LoginPage.module.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      if (!result.requiresConsent) {
        const home = result.user.role === 'INSTITUTION' ? '/agency' : '/home';
        navigate(searchParams.get('redirect') ?? home, { replace: true });
      } else {
        navigate('/consent', { replace: true, state: {
          pendingGoogle: {
            pendingToken: result.pendingToken,
            email: result.googleEmail,
            name: result.googleName,
          },
        }});
      }
    } catch {
      setError('Google 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // always points to the latest handleGoogleCredential so the GSI callback isn't stale
  const handleGoogleCredentialRef = useRef(handleGoogleCredential);
  useLayoutEffect(() => {
    handleGoogleCredentialRef.current = handleGoogleCredential;
  });

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    const initialize = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => { void handleGoogleCredentialRef.current(credential); },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: String(googleBtnRef.current.clientWidth || 280),
        text: 'signin_with',
        locale: 'ko',
      });
    };

    if (window.google) {
      initialize();
    } else {
      const script = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
      script?.addEventListener('load', initialize);
      return () => script?.removeEventListener('load', initialize);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      const redirect = searchParams.get('redirect');
      const home = user.role === 'INSTITUTION' ? '/agency' : '/home';
      navigate(redirect ?? home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않아요.');
      } else {
        setError('로그인 중 오류가 발생했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>돌봄을 잇는 기록</p>
            <h1>로그인</h1>
          </div>
          <p className={styles.notice}>보안을 위해 로그인 상태는 이 브라우저에 저장되지 않습니다. 새로고침 후 다시 로그인해 주세요.</p>
          <form className={styles.form} onSubmit={(e) => { void handleSubmit(e); }}>
            <label>
              이메일
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button className={styles.submit} type="submit" disabled={isLoading}>
              {isLoading ? '로그인 중…' : '로그인'}
            </button>
          </form>
          <div className={styles.divider}>또는</div>
          <div ref={googleBtnRef} className={styles.googleButton} />
          <p className={styles.signup}>계정이 없으신가요? 회원가입 (준비 중)</p>
        </div>
      </main>
    </AppShell>
  );
}
