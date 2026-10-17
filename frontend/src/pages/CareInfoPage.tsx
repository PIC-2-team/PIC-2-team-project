import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCareInfoOverview } from '../api/careInfo';
import type { CareInfoCategory, CareInfoOverview } from '../types/careInfo';
import { toSeoulDateKey } from '../utils/date';
import styles from './CareInfoPage.module.css';

const CATEGORIES: { id: CareInfoCategory; label: string; bg: string }[] = [
  { id: 'COMMUNICATION', label: '의사소통', bg: '#e8f5ee' },
  { id: 'PREFERENCE', label: '선호·비선호', bg: '#fdedf0' },
  { id: 'LIFESTYLE', label: '생활습관', bg: '#fff3e8' },
  { id: 'HEALTH_MEDICATION', label: '건강·복약', bg: '#e8f0fb' },
  { id: 'PRECAUTION', label: '주의사항', bg: '#fff8e1' },
  { id: 'EMERGENCY', label: '위기대처', bg: '#fdedf0' },
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

      <nav className={styles.tabRow} aria-label="돌봄정보 카테고리">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.tab} ${active === cat.id ? styles.tabActive : ''}`}
            style={active === cat.id ? { background: cat.bg } : undefined}
            onClick={() => setActive(cat.id)}
            aria-current={active === cat.id ? 'page' : undefined}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <section className={styles.infoSection} aria-label={activeMeta?.label}>
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
