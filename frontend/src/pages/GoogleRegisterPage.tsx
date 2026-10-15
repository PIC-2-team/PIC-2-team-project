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
    <main style={{ maxWidth: 390, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>역할 선택</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        <strong>{pending.name}</strong>({pending.email})으로 가입합니다. 역할을 선택해주세요.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ROLES.map(({ value, label, desc }) => (
          <label
            key={value}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              border: `2px solid ${selectedRole === value ? '#3CAB7E' : '#e5e7eb'}`,
              borderRadius: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="role"
              value={value}
              checked={selectedRole === value}
              onChange={() => setSelectedRole(value)}
              style={{ marginTop: '0.2rem' }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{desc}</div>
            </div>
          </label>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#dc2626', marginTop: '1rem' }}>{error}</p>}
      <button
        type="button"
        onClick={() => { void handleSubmit(); }}
        disabled={!selectedRole || isLoading}
        style={{ marginTop: '1.5rem', width: '100%', padding: '0.875rem', background: '#3CAB7E', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '1rem', fontWeight: 600, cursor: selectedRole && !isLoading ? 'pointer' : 'not-allowed', opacity: !selectedRole || isLoading ? 0.5 : 1 }}
      >
        {isLoading ? '가입 중…' : '가입하기'}
      </button>
    </main>
  );
}
