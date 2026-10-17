import { AppShell } from '../components/AppShell';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { googleRegister } from '../api/auth';
import type { GoogleRegisterRequest } from '../types/auth';

type Role = GoogleRegisterRequest['role'];

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'GUARDIAN', label: '돌봄 보호자', desc: '발달장애인의 부모·가족으로 기록을 직접 관리합니다.' },
  { value: 'SUPPORT_WORKER', label: '활동지원사', desc: '담당 이용자의 기록을 열람하고 제안합니다.' },
  { value: 'INSTITUTION', label: '기관 담당자', desc: '소속 이용자와 지원자를 관리합니다.' },
];

type LocationState = {
  pendingGoogle?: { pendingToken: string; email: string; name: string };
  consentTicket?: string;
} | null;

export function GoogleRegisterPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = state?.pendingGoogle ?? null;
  const consentTicket = state?.consentTicket ?? null;

  if (!pending || !consentTicket) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedRole) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleRegister({
        pendingToken: pending.pendingToken,
        consentTicket,
        role: selectedRole,
      });
      if (result.requiresConsent) {
        setError('회원가입 중 오류가 발생했어요. 다시 시도해주세요.');
        return;
      }
      setAuth({ accessToken: result.accessToken, user: result.user });
      navigate('/home', { replace: true });
    } catch {
      setError('회원가입 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="demo-page">
        <div className="page-heading"><h1>역할 선택</h1></div>
        <p className="hint"><strong>{pending.name}</strong>({pending.email})으로 가입합니다. 역할을 선택해주세요.</p>
        <div className="demo-form">
          {ROLES.map(({ value, label, desc }) => (
            <label key={value} className="choice">
              <input type="radio" name="role" value={value} checked={selectedRole === value} onChange={() => setSelectedRole(value)} />
              <span><strong>{label}</strong><small>{desc}</small></span>
            </label>
          ))}
        </div>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="btn" type="button" onClick={() => { void handleSubmit(); }} disabled={!selectedRole || isLoading}>
          {isLoading ? '가입 중…' : '가입하기'}
        </button>
      </main>
    </AppShell>
  );
}
