import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCareInfoOverview } from '../api/careInfo';
import type { CareInfoCategory, CareInfoOverview } from '../types/careInfo';
import { toSeoulDateKey } from '../utils/date';
import styles from './CareInfoPage.module.css';

const CATEGORIES: { id: CareInfoCategory; label: string; bg: string; icon: ReactNode }[] = [
  {
    id: 'COMMUNICATION',
    label: '의사소통',
    bg: '#e8f5ee',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="13" cy="15" r="8" fill="#3CAB7E" />
        <circle cx="23" cy="19" r="8" fill="#2d9468" />
        <circle cx="10" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="16" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="20" cy="17" r="3" fill="white" opacity="0.6" />
        <circle cx="26" cy="17" r="3" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'LIFESTYLE',
    label: '생활습관',
    bg: '#fff3e8',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 16L18 6l12 10v14H6V16z" fill="#f57c00" />
        <rect x="14" y="22" width="8" height="8" rx="1" fill="white" opacity="0.8" />
        <rect x="16" y="19" width="4" height="4" rx="0.5" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'MEAL',
    label: '식사',
    bg: '#fff0f6',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <ellipse cx="18" cy="20" rx="11" ry="8" fill="#c2185b" opacity="0.15" />
        <ellipse cx="18" cy="20" rx="11" ry="8" stroke="#c2185b" strokeWidth="2" />
        <line x1="10" y1="8" x2="10" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="8" x2="14" y2="12" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="8" x2="14" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="8" x2="26" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 8 Q24 10 26 12" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'PREFERENCE',
    label: '선호·비선호',
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M18 29s-13-8.5-13-16a8 8 0 0116 0 8 8 0 0116 0c0 7.5-13 16-19 16z"
          fill="#e05555"
        />
      </svg>
    ),
  },
  {
    id: 'CHALLENGING_BEHAVIOR',
    label: '도전행동',
    bg: '#fef3e2',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 6 L30 28 H6 Z" fill="#e65100" opacity="0.15" />
        <path d="M18 6 L30 28 H6 Z" stroke="#e65100" strokeWidth="2" strokeLinejoin="round" />
        <rect x="16.5" y="14" width="3" height="7" rx="1.5" fill="#e65100" />
        <circle cx="18" cy="24.5" r="1.8" fill="#e65100" />
      </svg>
    ),
  },
  {
    id: 'HEALTH',
    label: '건강·복약',
    bg: '#e8f0fb',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect
          x="8" y="14" width="20" height="9" rx="4.5"
          fill="#5b8dee"
          transform="rotate(-45 18 18)"
        />
        <line
          x1="11" y1="25" x2="25" y2="11"
          stroke="white" strokeWidth="2" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'EMERGENCY',
    label: '위기대처',
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="10" y="18" width="16" height="10" rx="2" fill="#e05555" />
        <path d="M13 18V14a5 5 0 0110 0v4" stroke="#e05555" strokeWidth="2.5" fill="none" />
        <ellipse cx="18" cy="13" rx="7" ry="5" fill="#e05555" opacity="0.25" />
        <circle cx="18" cy="22" r="2.5" fill="white" />
        <line x1="8" y1="14" x2="5" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="14" x2="31" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="10" x2="18" y2="7" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'OTHER',
    label: '기타',
    bg: '#f5f5f5',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="12" fill="#9e9e9e" opacity="0.15" />
        <circle cx="18" cy="18" r="12" stroke="#9e9e9e" strokeWidth="2" />
        <circle cx="11" cy="18" r="2" fill="#9e9e9e" />
        <circle cx="18" cy="18" r="2" fill="#9e9e9e" />
        <circle cx="25" cy="18" r="2" fill="#9e9e9e" />
      </svg>
    ),
  },
];

export function CareInfoPage() {
  const { selectedRecipientId } = useAuth();
  const [active, setActive] = useState<CareInfoCategory>('COMMUNICATION');
  const [overview, setOverview] = useState<CareInfoOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipientId) return;
    let isCurrent = true;
    setIsLoading(true);
    setError(null);
    setOverview(null);
    getCareInfoOverview(selectedRecipientId)
      .then(data => { if (isCurrent) setOverview(data); })
      .catch(e => { if (isCurrent) setError(e instanceof Error ? e.message : '불러오기 실패'); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [selectedRecipientId]);

  const activeMeta = CATEGORIES.find(c => c.id === active);
  const info = overview?.categories.find(item => item.category === active);
  const pinnedRecords = overview?.pinnedRecords ?? [];
  const hasInfoContent = info && (typeof info.content === 'string' ? info.content.length > 0 : info.content != null);

  return (
    <div className="demo-page">
      <h1>돌봄정보</h1>

      {pinnedRecords.length > 0 && (
        <section className="demo-card accent" aria-labelledby="pinned-records-title">
          <h2 id="pinned-records-title">중요 생활기록</h2>
          <ul className={styles.recordList}>
            {pinnedRecords.map(record => (
              <li key={record.id}>
                <Link to={`/records/${record.id}`} className={styles.recordCard}>
                  <p>{record.content}</p>
                  <time dateTime={record.recordedAt}>{toSeoulDateKey(record.recordedAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.grid} role="group" aria-label="돌봄정보 카테고리">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.card} ${active === cat.id ? styles.cardActive : ''}`}
            onClick={() => setActive(cat.id)}
            aria-pressed={active === cat.id}
          >
            <span className={styles.iconWrap} style={{ background: cat.bg }}>{cat.icon}</span>
            <span className={styles.cardLabel}>{cat.label}</span>
          </button>
        ))}
      </div>

      <section aria-label={activeMeta?.label}>
        {isLoading && <p className="muted" role="status">불러오는 중…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!isLoading && !error && !hasInfoContent && (
          <div className="empty-state">
            <p>{activeMeta?.label} 정보가 아직 없어요.</p>
          </div>
        )}
        {hasInfoContent && info && (
          <div className="demo-card">
            <h2>{activeMeta?.label}</h2>
            {/* content 스키마 미확정 — 확정 후 구조화 UI로 교체 */}
            {typeof info.content === 'string'
              ? <p>{info.content}</p>
              : <pre style={{ fontSize: '0.8125rem', overflow: 'auto' }}>{JSON.stringify(info.content, null, 2)}</pre>
            }
            {info.updatedAt && <p className="muted">
              마지막 업데이트: {new Date(info.updatedAt).toLocaleDateString('ko-KR')}
            </p>}
          </div>
        )}
      </section>
    </div>
  );
}
