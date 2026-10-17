import { AppShell } from '../components/AppShell';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitConsent } from '../api/auth';
import styles from './ConsentPage.module.css';

const CONSENT_ITEMS = [
  {
    id: 'basicInfo' as const,
    required: true,
    title: '기본 개인정보 수집·이용 동의',
    description: '서비스 제공을 위한 필수 정보입니다.',
  },
  {
    id: 'sensitiveInfo' as const,
    required: true,
    title: '건강·복약정보 등 민감정보 처리 동의',
    description: '맞춤형 건강관리 서비스 제공을 위한 필수 정보입니다.',
  },
  {
    id: 'caregiverShare' as const,
    required: true,
    title: '담당 돌봄 제공자에게 필요한 정보 공유 동의',
    description: '더 나은 돌봄 서비스를 위한 필수 정보입니다.',
  },
  {
    id: 'marketing' as const,
    required: false,
    title: '마케팅·부가서비스 동의',
    description: '다양한 이벤트와 유용한 정보를 받아보실 수 있습니다.',
  },
];

type ConsentKey = (typeof CONSENT_ITEMS)[number]['id'];

type PendingGoogle = { pendingToken: string; email: string; name: string };

export function ConsentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingGoogle = (location.state as { pendingGoogle?: PendingGoogle } | null)?.pendingGoogle ?? null;
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    basicInfo: false,
    sensitiveInfo: false,
    caregiverShare: false,
    marketing: false,
  });

  const allRequiredChecked = CONSENT_ITEMS
    .filter(item => item.required)
    .every(item => consents[item.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: ConsentKey) =>
    setConsents(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async () => {
    if (!allRequiredChecked) return;
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
        navigate('/google-register', { state: { pendingGoogle, consentTicket } });
      } else {
        navigate('/login');
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
          <p className={styles.subtitle}>서비스 이용을 위해 아래 내용을 확인해주세요</p>
        </div>

        <div className={styles.items}>
          {CONSENT_ITEMS.map(item => (
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

        <button
          className={styles.submitButton}
          type="button"
          onClick={() => { void handleSubmit(); }}
          disabled={!allRequiredChecked || isSubmitting}
          aria-disabled={!allRequiredChecked || isSubmitting}
        >
          {isSubmitting ? '처리 중…' : '동의하고 시작하기'}
        </button>
      </div>
    </AppShell>
  );
}
