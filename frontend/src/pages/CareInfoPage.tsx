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
    id: 'HEALTH_MEDICATION',
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
    id: 'PRECAUTION',
    label: '주의사항',
    bg: '#fff8e1',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 5L33 30H3L18 5z" fill="#f9a825" />
        <rect x="16.5" y="14" width="3" height="8" rx="1.5" fill="white" />
        <circle cx="18" cy="25" r="1.8" fill="white" />
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
    <div className={styles.page}>
      <h1 className={styles.title}>돌봄정보</h1>

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

      <section className={styles.infoSection} aria-label={activeMeta?.label}>
        <h2 className={styles.sectionTitle}>{activeMeta?.label}</h2>
        {isLoading && <p>불러오는 중…</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && !hasInfoContent && <p className={styles.empty}>아직 입력된 정보가 없어요.</p>}
        {hasInfoContent && info && (
          <div className={styles.infoContent}>
            {/* content 스키마 미확정 — 확정 후 구조화 UI로 교체 */}
            {typeof info.content === 'string'
              ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{info.content}</p>
              : <pre style={{ fontSize: '0.8125rem', overflow: 'auto' }}>{JSON.stringify(info.content, null, 2)}</pre>
            }
            {info.updatedAt && <p className={styles.updatedAt}>
              마지막 업데이트: {new Date(info.updatedAt).toLocaleDateString('ko-KR')}
            </p>}
          </div>
        )}
      </section>

      <section className={styles.pinnedSection} aria-labelledby="pinned-records-title">
        <h2 id="pinned-records-title" className={styles.sectionTitle}>중요 생활기록</h2>
        {isLoading && <p>불러오는 중…</p>}
        {error && <p role="alert">{error}</p>}
        {!isLoading && !error && pinnedRecords.length === 0 && (
          <p className={styles.empty}>아직 표시할 생활기록이 없어요.</p>
        )}
        {!isLoading && !error && pinnedRecords.length > 0 && (
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
        )}
      </section>
    </div>
  );
}
