import { AppShell } from '../components/AppShell';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitConsent } from '../api/auth';
import styles from './ConsentPage.module.css';

type Role = 'GUARDIAN' | 'SUPPORT_WORKER' | 'INSTITUTION';

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'GUARDIAN', label: '돌봄 보호자', desc: '발달장애인의 부모·가족으로 기록을 직접 관리합니다.' },
  { value: 'SUPPORT_WORKER', label: '활동지원사', desc: '담당 이용자의 기록을 열람하고 제안합니다.' },
  { value: 'INSTITUTION', label: '기관 담당자', desc: '소속 이용자와 지원자를 관리합니다.' },
];

type ConsentKey = 'basicInfo' | 'sensitiveInfo' | 'caregiverShare' | 'marketing';

type ConsentItem = {
  id: ConsentKey;
  required: boolean;
  title: string;
  description: string;
};

const CONSENT_ITEMS_BY_ROLE: Record<Role, ConsentItem[]> = {
  GUARDIAN: [
    { id: 'basicInfo', required: true, title: '기본 개인정보 수집·이용 동의', description: '서비스 제공을 위한 필수 정보입니다.' },
    { id: 'sensitiveInfo', required: true, title: '건강·복약정보 등 민감정보 처리 동의', description: '맞춤형 건강관리 서비스 제공을 위한 필수 정보입니다.' },
    { id: 'caregiverShare', required: true, title: '담당 돌봄 제공자에게 필요한 정보 공유 동의', description: '더 나은 돌봄 서비스를 위한 필수 정보입니다.' },
    { id: 'marketing', required: false, title: '마케팅·부가서비스 동의', description: '다양한 이벤트와 유용한 정보를 받아보실 수 있습니다.' },
  ],
  SUPPORT_WORKER: [
    { id: 'basicInfo', required: true, title: '기본 개인정보 수집·이용 동의', description: '서비스 제공을 위한 필수 정보입니다.' },
    { id: 'marketing', required: false, title: '마케팅·부가서비스 동의', description: '다양한 이벤트와 유용한 정보를 받아보실 수 있습니다.' },
  ],
  INSTITUTION: [
    { id: 'basicInfo', required: true, title: '기본 개인정보 수집·이용 동의', description: '서비스 제공을 위한 필수 정보입니다.' },
    { id: 'marketing', required: false, title: '마케팅·부가서비스 동의', description: '다양한 이벤트와 유용한 정보를 받아보실 수 있습니다.' },
  ],
};

type PendingGoogle = { pendingToken: string; email: string; name: string };

export function ConsentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingGoogle = (location.state as { pendingGoogle?: PendingGoogle } | null)?.pendingGoogle ?? null;

  const [step, setStep] = useState<'role' | 'consent'>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    basicInfo: false,
    sensitiveInfo: false,
    caregiverShare: false,
    marketing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentItems = selectedRole ? CONSENT_ITEMS_BY_ROLE[selectedRole] : [];
  const allRequiredChecked = consentItems
    .filter(item => item.required)
    .every(item => consents[item.id]);

  const toggle = (id: ConsentKey) =>
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));

  const handleNext = () => {
    if (!selectedRole) return;
    setConsents({ basicInfo: false, sensitiveInfo: false, caregiverShare: false, marketing: false });
    setStep('consent');
  };

  const handleBack = () => {
    setStep('role');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!allRequiredChecked || !selectedRole) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { consentTicket } = await submitConsent({
        basicInfo: consents.basicInfo,
        sensitiveInfo: consents.sensitiveInfo,
        caregiverShare: consents.caregiverShare,
        marketing: consents.marketing,
        termsVersion: '1.0',
      });
      if (pendingGoogle) {
        navigate('/google-register', { state: { pendingGoogle, consentTicket, role: selectedRole } });
      } else {
        navigate('/register', { state: { consentTicket, role: selectedRole } });
      }
    } catch {
      setError('동의 처리 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className={styles.page}>
        {step === 'role' ? (
          <>
            <div className={styles.top}>
              <div className={styles.illustrationWrap}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <circle cx="32" cy="20" r="10" fill="white" stroke="#c8e6d8" strokeWidth="2" />
                  <path d="M14 52c0-9.9 8.1-18 18-18s18 8.1 18 18" stroke="#c8e6d8" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <circle cx="46" cy="46" r="12" fill="#3CAB7E" />
                  <path d="M41 46l3.5 3.5L51 41" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className={styles.title}>역할 선택</h1>
              <p className={styles.subtitle}>삶결을 어떤 역할로 이용하실 건가요?</p>
            </div>

            <div className="demo-form" style={{ width: '100%', marginBottom: '2rem' }}>
              {ROLE_OPTIONS.map(({ value, label, desc }) => (
                <label key={value} className="choice">
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={selectedRole === value}
                    onChange={() => setSelectedRole(value)}
                  />
                  <span><strong>{label}</strong><small>{desc}</small></span>
                </label>
              ))}
            </div>

            <button
              className={styles.submitButton}
              type="button"
              onClick={handleNext}
              disabled={!selectedRole}
            >
              다음
            </button>
          </>
        ) : (
          <>
            <div className={styles.top}>
              <div className={styles.illustrationWrap}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <rect x="10" y="6" width="38" height="48" rx="5" fill="white" stroke="#c8e6d8" strokeWidth="2" />
                  <line x1="18" y1="20" x2="40" y2="20" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="28" x2="40" y2="28" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="36" x2="32" y2="36" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="46" cy="46" r="12" fill="#3CAB7E" />
                  <polyline points="40,46 44,50 52,41" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className={styles.title}>이용 동의</h1>
              <p className={styles.subtitle}>
                {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label} 역할로 가입합니다.{'\n'}
                서비스 이용을 위해 아래 내용을 확인해주세요.
              </p>
            </div>

            <div className={styles.items}>
              {consentItems.map(item => (
                <label key={item.id} className={styles.item} htmlFor={item.id}>
                  <input
                    id={item.id}
                    type="checkbox"
                    className={styles.checkbox}
                    checked={consents[item.id]}
                    onChange={() => toggle(item.id)}
                  />
                  <div className={styles.itemContent}>
                    <span className={styles.itemTitle}>
                      <span className={styles.badge}>{item.required ? '[필수]' : '[선택]'}</span>
                      {' '}{item.title}
                    </span>
                    <span className={styles.itemDesc}>{item.description}</span>
                  </div>
                  <span className={styles.chevron} aria-hidden="true">›</span>
                </label>
              ))}

              <button className={styles.termsRow} type="button">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="3" y="2" width="14" height="16" rx="2" stroke="#8a9ab0" strokeWidth="1.5" />
                  <line x1="6" y1="7" x2="14" y2="7" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="6" y1="10" x2="14" y2="10" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="6" y1="13" x2="10" y2="13" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>전체 약관 보기</span>
                <span className={styles.chevron} aria-hidden="true">›</span>
              </button>
            </div>

            {error && <p role="alert" className={styles.error}>{error}</p>}

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
              <button
                className={styles.submitButton}
                type="button"
                onClick={() => { void handleSubmit(); }}
                disabled={!allRequiredChecked || isSubmitting}
              >
                {isSubmitting ? '처리 중…' : '동의하고 시작하기'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                style={{ background: 'none', border: 'none', color: '#8a9ab0', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem' }}
              >
                ← 역할 다시 선택
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
