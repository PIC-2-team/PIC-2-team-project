import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRecordsByCategory, pinRecord } from '../api/records';
import { getCareInfoByCategory } from '../api/careInfo';
import type { DailyRecord, RecordCategory } from '../types/record';
import type { CareInfo } from '../types/careInfo';
import { toSeoulDateKey } from '../utils/date';
import styles from './CareInfoDetailPage.module.css';

interface CareInfoItem {
  id: number;
  content: string;
  pinned: boolean;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; desc: string; bg: string; color: string; normalizedCategory: RecordCategory; icon: React.ReactNode }> = {
  COMMUNICATION: {
    label: '의사소통',
    desc: '의사소통 방식',
    bg: '#e8f5ee',
    color: '#3CAB7E',
    normalizedCategory: 'COMMUNICATION',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="13" cy="15" r="8" fill="#3CAB7E" />
        <circle cx="23" cy="19" r="8" fill="#2d9468" />
        <circle cx="10" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="16" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="20" cy="17" r="3" fill="white" opacity="0.6" />
        <circle cx="26" cy="17" r="3" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  LIFESTYLE: {
    label: '생활습관',
    desc: '일과 및 생활 습관',
    bg: '#fff3e8',
    color: '#f57c00',
    normalizedCategory: 'LIFESTYLE',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 16L18 6l12 10v14H6V16z" fill="#f57c00" />
        <rect x="14" y="22" width="8" height="8" rx="1" fill="white" opacity="0.8" />
      </svg>
    ),
  },
  MEAL: {
    label: '식사',
    desc: '식습관 및 식사 정보',
    bg: '#fff0f6',
    color: '#c2185b',
    normalizedCategory: 'MEAL',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <ellipse cx="18" cy="20" rx="11" ry="8" fill="#c2185b" opacity="0.15" />
        <ellipse cx="18" cy="20" rx="11" ry="8" stroke="#c2185b" strokeWidth="2" />
        <line x1="10" y1="8" x2="10" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="8" x2="14" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="8" x2="26" y2="16" stroke="#c2185b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  PREFERENCE: {
    label: '선호/비선호',
    desc: '선호 · 비선호',
    bg: '#fdedf0',
    color: '#e05555',
    normalizedCategory: 'PREFERENCE',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 29s-13-8.5-13-16a8 8 0 0116 0 8 8 0 0116 0c0 7.5-13 16-19 16z" fill="#e05555" />
      </svg>
    ),
  },
  CHALLENGING_BEHAVIOR: {
    label: '도전행동 · 주의사항',
    desc: '주의 행동 및 대처법',
    bg: '#fef3e2',
    color: '#e65100',
    normalizedCategory: 'CHALLENGING_BEHAVIOR',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 6 L30 28 H6 Z" fill="#e65100" opacity="0.15" />
        <path d="M18 6 L30 28 H6 Z" stroke="#e65100" strokeWidth="2" strokeLinejoin="round" />
        <rect x="16.5" y="14" width="3" height="7" rx="1.5" fill="#e65100" />
        <circle cx="18" cy="24.5" r="1.8" fill="#e65100" />
      </svg>
    ),
  },
  PRECAUTION: {
    label: '주의사항',
    desc: '주의 행동 및 대처법',
    bg: '#fff8e1',
    color: '#f9a825',
    normalizedCategory: 'CHALLENGING_BEHAVIOR',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 6 L30 28 H6 Z" fill="#f9a825" stroke="#f9a825" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  HEALTH: {
    label: '건강·복약',
    desc: '복약 및 건강 상태',
    bg: '#e8f0fb',
    color: '#5b8dee',
    normalizedCategory: 'HEALTH',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="8" y="14" width="20" height="9" rx="4.5" fill="#5b8dee" transform="rotate(-45 18 18)" />
      </svg>
    ),
  },
  HEALTH_MEDICATION: {
    label: '건강·복약',
    desc: '복약 및 건강 상태',
    bg: '#e8f0fb',
    color: '#5b8dee',
    normalizedCategory: 'HEALTH',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="8" y="14" width="20" height="9" rx="4.5" fill="#5b8dee" transform="rotate(-45 18 18)" />
      </svg>
    ),
  },
  EMERGENCY: {
    label: '위기대응',
    desc: '위기 대처 및 비상 연락망',
    bg: '#fdedf0',
    color: '#e05555',
    normalizedCategory: 'EMERGENCY',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="10" y="18" width="16" height="10" rx="2" fill="#e05555" />
        <path d="M13 18V14a5 5 0 0110 0v4" stroke="#e05555" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  OTHER: {
    label: '기타',
    desc: '기타 참고 사항',
    bg: '#f5f5f5',
    color: '#757575',
    normalizedCategory: 'OTHER',
    icon: (
      <svg width="24" height="24" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="12" fill="#9e9e9e" opacity="0.15" />
      </svg>
    ),
  },
};

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11 2L16 7L11 7L9 13L7 7L2 7L7 2L9 4L11 2Z"
        fill={filled ? '#3CAB7E' : 'none'}
        stroke={filled ? '#3CAB7E' : '#b0bec5'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="9" y1="13" x2="9" y2="16" stroke={filled ? '#3CAB7E' : '#b0bec5'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CareInfoDetailPage() {
  const { categoryId = '' } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { selectedRecipientId, user } = useAuth();
  const meta = CATEGORY_META[categoryId];

  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [careInfo, setCareInfo] = useState<CareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipientId || !meta) return;
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      getRecordsByCategory(selectedRecipientId, meta.normalizedCategory),
      getCareInfoByCategory(selectedRecipientId, meta.normalizedCategory),
    ]).then(([recResult, infoResult]) => {
      if (!isCurrent) return;
      if (recResult.status === 'fulfilled') {
        setRecords(recResult.value.items ?? []);
        setTotalCount(recResult.value.pagination?.totalItems ?? recResult.value.items?.length ?? 0);
      } else {
        setError(recResult.reason instanceof Error ? recResult.reason.message : '기록을 불러오지 못했어요.');
      }
      if (infoResult.status === 'fulfilled') {
        setCareInfo(infoResult.value);
      }
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => { isCurrent = false; };
  }, [selectedRecipientId, meta]);

  if (!meta) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/care-info')} aria-label="뒤로가기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className={styles.title}>돌봄정보</h1>
          <div className={styles.headerRight} />
        </header>
        <div className={styles.body}>
          <p className="error">존재하지 않는 카테고리입니다.</p>
        </div>
      </div>
    );
  }

  const isGuardian = user?.role === 'GUARDIAN';

  const togglePin = async (recordId: number, currentPinned: boolean) => {
    if (!selectedRecipientId || !isGuardian) return;
    // 낙관적 업데이트
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, pinned: !currentPinned } : r));
    try {
      await pinRecord(selectedRecipientId, recordId, !currentPinned);
    } catch {
      // 롤백
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, pinned: currentPinned } : r));
      setError('중요 정보 고정에 실패했어요.');
    }
  };

  const pinned = records.filter(r => r.pinned);
  const ALL_RECORD_LIMIT = 5;
  const visibleRecords = showAllRecords ? records : records.slice(0, ALL_RECORD_LIMIT);
  const hasMoreRecords = !showAllRecords && records.length > ALL_RECORD_LIMIT;
  const hasCareInfoContent = careInfo && (typeof careInfo.content === 'string' ? careInfo.content.length > 0 : careInfo.content != null);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/care-info')}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.title}>{meta.label}</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.body}>
        <div className={styles.bannerCard} style={{ background: meta.bg }}>
          <div className={styles.bannerIcon}>{meta.icon}</div>
          <div className={styles.bannerText}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className={styles.bannerTitle}>{meta.label}</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color, background: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                전체 기록 {totalCount}개
              </span>
            </div>
            <p className={styles.bannerDesc}>{meta.desc}</p>
          </div>
        </div>

        {isLoading && <p className="muted" role="status">기록을 불러오는 중…</p>}
        {error && <p className="error" role="alert">{error}</p>}

        {hasCareInfoContent && (
          <section className="demo-card">
            <p className={styles.sectionLabel}>📋 기본 안내</p>
            {typeof careInfo.content === 'string'
              ? <p className={styles.cardContent}>{careInfo.content}</p>
              : <pre style={{ fontSize: '0.8125rem', overflow: 'auto' }}>{JSON.stringify(careInfo.content, null, 2)}</pre>
            }
            {careInfo.updatedAt && (
              <p className={styles.cardDate}>
                마지막 업데이트: {new Date(careInfo.updatedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </section>
        )}

        {pinned.length > 0 && (
          <section className={styles.pinnedSection}>
            <p className={styles.sectionLabel}>📌 중요 정보</p>
            <div className={styles.list}>
              {pinned.map(item => (
                <ItemCard
                  key={item.id}
                  item={{
                    id: item.id,
                    content: item.content,
                    pinned: true,
                    updatedAt: toSeoulDateKey(item.recordedAt),
                  }}
                  onTogglePin={() => void togglePin(item.id, true)}
                  canPin={isGuardian}
                />
              ))}
            </div>
          </section>
        )}

        <section className={styles.allSection}>
          <p className={styles.sectionLabel}>전체 기록 ({totalCount})</p>
          {records.length === 0 && !isLoading && (
            <div className="empty-state">
              <p>아직 등록된 {meta.label} 기록이 없어요.</p>
            </div>
          )}
          <div className={styles.list}>
            {visibleRecords.map(item => (
              <ItemCard
                key={item.id}
                item={{
                  id: item.id,
                  content: item.content,
                  pinned: item.pinned ?? false,
                  updatedAt: toSeoulDateKey(item.recordedAt),
                }}
                onTogglePin={() => void togglePin(item.id, item.pinned ?? false)}
                canPin={isGuardian}
              />
            ))}
            {hasMoreRecords && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={() => setShowAllRecords(true)}
              >
                더 보기 ({records.length - ALL_RECORD_LIMIT}개 더)
              </button>
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        {isGuardian ? (
          <button
            type="button"
            className={styles.addButton}
            style={{ background: meta.color }}
            onClick={() => navigate('/records/new', { state: { category: meta.normalizedCategory, returnToCareInfo: true } })}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            중요 정보 기록하기
          </button>
        ) : user?.role === 'SUPPORT_WORKER' ? (
          <button
            type="button"
            className={styles.addButton}
            style={{ background: '#3CAB7E' }}
            onClick={() => navigate('/record-requests/new', { state: { category: meta.normalizedCategory, categoryLabel: meta.label } })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            돌봄 내용 수정 요청
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onTogglePin,
  canPin,
}: {
  item: CareInfoItem;
  onTogglePin: () => void;
  canPin: boolean;
}) {
  return (
    <div className={`${styles.card} ${item.pinned ? styles.cardPinned : ''}`}>
      <p className={styles.cardContent}>{item.content}</p>
      <div className={styles.cardMeta}>
        <span className={styles.cardDate}>{item.updatedAt}</span>
        {canPin && (
          <button
            type="button"
            className={styles.pinButton}
            onClick={onTogglePin}
            aria-label={item.pinned ? '핀 해제' : '중요 정보로 고정'}
            aria-pressed={item.pinned}
          >
            <PinIcon filled={item.pinned} />
          </button>
        )}
      </div>
    </div>
  );
}
