import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRecordsByMonth } from '../api/records';
import type { DailyRecord, RecordCategory } from '../types/record';
import { toSeoulDateKey } from '../utils/date';
import { Skeleton } from '../components/Skeleton/Skeleton';
import styles from './DailyRecordPage.module.css';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const CATEGORY_COLOR: Record<RecordCategory, string> = {
  COMMUNICATION: '#e8f5ee',
  LIFESTYLE: '#f3e8fb',
  MEAL: '#fff8e8',
  PREFERENCE: '#fce8f0',
  CHALLENGING_BEHAVIOR: '#ffe8e8',
  HEALTH: '#fff3e0',
  EMERGENCY: '#fde9e0',
  OTHER: '#edf0f3',
};

const CATEGORY_ICON: Record<RecordCategory, React.ReactNode> = {
  COMMUNICATION: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4a4 4 0 00-2.8 6.8L11 14l2.8-3.2A4 4 0 0011 4z" fill="#3CAB7E" />
    </svg>
  ),
  LIFESTYLE: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="18" height="15" rx="2" fill="#9c5ee0" />
    </svg>
  ),
  MEAL: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M7 3v6a4 4 0 004 4 4 4 0 004-4V3" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="11" y1="13" x2="11" y2="19" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  PREFERENCE: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 5c-3.5-3.5-8 0-5 5l5 7 5-7c3-5-1.5-8.5-5-5z" fill="#e05e9c" />
    </svg>
  ),
  CHALLENGING_BEHAVIOR: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#e05e5e" />
    </svg>
  ),
  HEALTH: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="8" y="3" width="6" height="16" rx="3" fill="#ff9800" transform="rotate(45 11 11)" />
    </svg>
  ),
  EMERGENCY: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 3l8.5 15H2.5z" fill="#ff5722" />
      <line x1="11" y1="9" x2="11" y2="13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="11" cy="16" r="0.8" fill="white" />
    </svg>
  ),
  OTHER: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" fill="#8a9ab0" />
    </svg>
  ),
};

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function getWeekdayLabel(year: number, month: number, day: number) {
  return DAYS[new Date(year, month, day).getDay()];
}

const CATEGORY_LABEL: Record<RecordCategory | 'ALL', string> = {
  ALL: '전체',
  COMMUNICATION: '의사소통',
  LIFESTYLE: '생활습관',
  MEAL: '식사',
  PREFERENCE: '선호·비선호',
  CHALLENGING_BEHAVIOR: '도전적 행동',
  HEALTH: '건강정보',
  EMERGENCY: '위기대처',
  OTHER: '기타',
};

const CATEGORY_ORDER: Array<RecordCategory | 'ALL'> = [
  'ALL', 'COMMUNICATION', 'LIFESTYLE', 'MEAL', 'PREFERENCE',
  'CHALLENGING_BEHAVIOR', 'HEALTH', 'EMERGENCY', 'OTHER',
];

const DAY_RECORD_LIMIT = 3;

export function DailyRecordPage() {
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();
  const [today] = useState(() => {
    const [year, month, day] = toSeoulDateKey(new Date().toISOString()).split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [monthRecords, setMonthRecords] = useState<DailyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RecordCategory | 'ALL'>('ALL');
  const [showAllDayRecords, setShowAllDayRecords] = useState(false);

  useEffect(() => {
    if (!selectedRecipientId) return;
    let isCurrent = true;
    setIsLoading(true);
    setError(null);
    setMonthRecords([]);
    getRecordsByMonth(selectedRecipientId, viewYear, viewMonth + 1)
      .then(res => { if (isCurrent) setMonthRecords(res.items); })
      .catch(e => { if (isCurrent) setError(e instanceof Error ? e.message : '기록 불러오기 실패'); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [selectedRecipientId, viewYear, viewMonth]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedKey = toDateKey(viewYear, viewMonth, selectedDay);
  const selectedRecords = monthRecords.filter(r =>
    toSeoulDateKey(r.recordedAt) === selectedKey &&
    (selectedCategory === 'ALL' || r.category === selectedCategory)
  );
  const datesWithRecords = new Set(monthRecords.map(r => toSeoulDateKey(r.recordedAt)));
  const visibleDayRecords = showAllDayRecords ? selectedRecords : selectedRecords.slice(0, DAY_RECORD_LIMIT);
  const hasMore = !showAllDayRecords && selectedRecords.length > DAY_RECORD_LIMIT;

  const canWrite = user?.role === 'GUARDIAN';

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="demo-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>생활기록</h1>
        <button
          className={styles.filterButton}
          type="button"
          aria-label={`필터${selectedCategory !== 'ALL' ? `: ${CATEGORY_LABEL[selectedCategory]}` : ''}`}
          onClick={() => setShowFilterSheet(v => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="2" y1="4" x2="14" y2="4" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4" y1="8" x2="12" y2="8" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="12" x2="10" y2="12" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          필터{selectedCategory !== 'ALL' && <span aria-hidden="true"> ●</span>}
        </button>

        {showFilterSheet && (
          <ul role="listbox" aria-label="카테고리 필터" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.5rem 0', listStyle: 'none', margin: 0 }}>
            {CATEGORY_ORDER.map(cat => (
              <li key={cat}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCategory === cat}
                  onClick={() => { setSelectedCategory(cat); setShowFilterSheet(false); setShowAllDayRecords(false); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: `1.5px solid ${selectedCategory === cat ? '#1a2533' : '#d0d5dc'}`,
                    background: selectedCategory === cat ? '#1a2533' : 'white',
                    color: selectedCategory === cat ? 'white' : '#4a5568',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {CATEGORY_LABEL[cat]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="demo-card accent" aria-label="월별 캘린더">
        <div className="calendar-heading">
          <button onClick={prevMonth} type="button" aria-label="이전 달">‹</button>
          <h2 style={{ margin: 0 }}>{viewYear}년 {viewMonth + 1}월</h2>
          <button onClick={nextMonth} type="button" aria-label="다음 달">›</button>
        </div>

        <div className="calendar-grid">
          {DAYS.map(d => (
            <span key={d} style={{ color: d === '일' ? '#e05555' : d === '토' ? '#5b8dee' : undefined }}>{d}</span>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const key = toDateKey(viewYear, viewMonth, day);
            const hasRecord = datesWithRecords.has(key);
            const isSelected = day === selectedDay;
            const weekday = new Date(viewYear, viewMonth, day).getDay();

            return (
              <button
                key={day}
                type="button"
                style={{ color: !isSelected && weekday === 0 ? '#e05555' : !isSelected && weekday === 6 ? '#5b8dee' : undefined }}
                onClick={() => setSelectedDay(day)}
                aria-label={`${viewMonth + 1}월 ${day}일${hasRecord ? ', 기록 있음' : ''}`}
                aria-pressed={isSelected}
              >
                {day}
                {hasRecord && <span aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading && <div data-testid="loading-skeleton"><Skeleton height={56} count={3} /></div>}
      {error && <p className="error" role="alert">{error}</p>}

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
            {viewMonth + 1}월 {selectedDay}일 ({getWeekdayLabel(viewYear, viewMonth, selectedDay)})
          </h2>
        </div>

        {selectedRecords.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>이 날의 기록이 없어요.</p>
        ) : (
          <div className={styles.records}>
            {visibleDayRecords.map(record => (
              <Link key={record.id} to={`/records/${record.id}`} className={styles.recordCard}>
                <div
                  className={styles.recordIcon}
                  style={{ background: CATEGORY_COLOR[record.category] }}
                >
                  {CATEGORY_ICON[record.category]}
                </div>
                <p className={styles.recordContent}>{record.content}</p>
              </Link>
            ))}
            {hasMore && (
              <button
                type="button"
                className={styles.viewAll}
                onClick={() => setShowAllDayRecords(true)}
              >
                더보기 ({selectedRecords.length - DAY_RECORD_LIMIT}개 더)
              </button>
            )}
          </div>
        )}
      </section>

      {canWrite && (
        <button
          className={`btn ${styles.recordButton}`}
          type="button"
          onClick={() => navigate('/records/new')}
        >
          기록하기
        </button>
      )}
    </div>
  );
}
