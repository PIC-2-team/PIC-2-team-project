import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api/client';

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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => { void handleGoogleCredential(credential); },
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '358',
        text: 'signin_with',
        locale: 'ko',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      if (!result.requiresConsent) {
        const home = result.user.role === 'AGENCY' ? '/agency' : '/home';
        navigate(searchParams.get('redirect') ?? home, { replace: true });
      } else {
        sessionStorage.setItem('pendingGoogle', JSON.stringify({
          idToken,
          email: result.googleEmail,
          name: result.googleName,
        }));
        navigate('/', { replace: true });
      }
    } catch {
      setError('Google 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      const redirect = searchParams.get('redirect');
      const home = user.role === 'AGENCY' ? '/agency' : '/home';
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
    <main style={{ maxWidth: 390, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>로그인</h1>
      <p>보안을 위해 로그인 상태는 이 브라우저에 저장되지 않습니다. 새로고침 후 다시 로그인해 주세요.</p>
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          이메일
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ display: 'block', width: '100%' }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? '로그인 중…' : '로그인'}
        </button>
      </form>
      <div style={{ margin: '1.5rem 0', textAlign: 'center', color: '#8a9ab0' }}>또는</div>
      <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
      <p>계정이 없으신가요? 회원가입 (준비 중)</p>
    </main>
  );
}
