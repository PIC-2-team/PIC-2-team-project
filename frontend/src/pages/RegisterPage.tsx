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

  const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;
  const isPhoneValid = PHONE_REGEX.test(phone.trim());
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const canSubmit = name.trim().length > 0 && email.length > 0 && password.length >= 8 && password === passwordConfirm && isPhoneValid;

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
        phone: phone.trim(),
        role,
      });
      setAuth(data);
      const home = role === 'INSTITUTION' ? '/agency' : '/home';
      navigate(home, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === 'PHONE_ALREADY_EXISTS') {
          setError('이미 가입된 전화번호예요. 다른 번호를 입력하거나 아이디/비밀번호 찾기를 이용해 주세요.');
        } else {
          setError('이미 사용 중인 이메일이에요. 다른 이메일을 입력해주세요.');
        }
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
            전화번호
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              autoComplete="tel"
              required
            />
            {phone.length > 0 && !isPhoneValid && (
              <span style={{ fontSize: '12px', color: '#a23d38' }}>올바른 전화번호 형식(010-0000-0000)을 입력해 주세요.</span>
            )}
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
