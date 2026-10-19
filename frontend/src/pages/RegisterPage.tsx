import { AppShell } from '../components/AppShell';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { register } from '../api/auth';
import { ApiError } from '../api/client';
import type { RegisterRequest } from '../types/auth';

type Role = RegisterRequest['role'];

const ROLE_LABELS: Record<Role, string> = {
  GUARDIAN: '돌봄 보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관 담당자',
};

type LocationState = { consentTicket: string; role: Role } | null;

export function RegisterPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state?.consentTicket || !state?.role) {
    navigate('/consent', { replace: true });
    return null;
  }

  const { consentTicket, role } = state;

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const canSubmit = name.trim().length > 0 && email.length > 0 && password.length >= 8 && password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await register({
        consentTicket,
        name: name.trim(),
        email,
        password,
        phone: phone.trim() || undefined,
        role,
      });
      setAuth(data);
      const home = role === 'INSTITUTION' ? '/agency' : '/home';
      navigate(home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('이미 사용 중인 이메일이에요. 다른 이메일을 입력해주세요.');
      } else {
        setError('회원가입 중 오류가 발생했어요. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="demo-page">
        <div className="page-heading">
          <h1>회원가입</h1>
        </div>

        <div className="demo-card accent">
          <p className="muted" style={{ margin: 0, fontSize: '0.8125rem' }}>선택한 역할</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{ROLE_LABELS[role]}</p>
        </div>

        <form className="demo-form" onSubmit={(e) => { void handleSubmit(e); }}>
          <label>
            이름
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
              maxLength={50}
              required
            />
          </label>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
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
              placeholder="8자 이상 입력"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {password.length > 0 && password.length < 8 && (
              <span style={{ fontSize: '12px', color: '#a23d38' }}>비밀번호는 8자 이상이어야 해요.</span>
            )}
          </label>
          <label>
            비밀번호 확인
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력"
              autoComplete="new-password"
              required
            />
            {passwordMismatch && (
              <span style={{ fontSize: '12px', color: '#a23d38' }}>비밀번호가 일치하지 않아요.</span>
            )}
          </label>
          <label>
            전화번호 <span className="muted" style={{ fontWeight: 400 }}>(선택)</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              autoComplete="tel"
            />
          </label>

          {error && <p role="alert" className="error" style={{ borderRadius: '10px', margin: 0 }}>{error}</p>}

          <button className="btn" type="submit" disabled={!canSubmit || isLoading}>
            {isLoading ? '가입 중…' : '가입하기'}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
