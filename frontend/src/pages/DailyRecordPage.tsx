import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRecords, getRecordsByMonth } from '../api/records';
import type { DailyRecord, RecordCategory } from '../types/record';
import { toSeoulDateKey } from '../utils/date';
import styles from './DailyRecordPage.module.css';
import { Skeleton } from '../components/Skeleton/Skeleton';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const CATEGORY_LABEL: Record<RecordCategory, string> = {
  COMMUNICATION: '의사소통', LIFESTYLE: '생활습관', MEAL: '식사',
  PREFERENCE: '선호·비선호', CHALLENGING_BEHAVIOR: '도전행동',
  HEALTH: '건강·복약', EMERGENCY: '위기대처', OTHER: '기타',
};

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

export function DailyRecordPage() {
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recordChangedAt = (location.state as { recordChangedAt?: number } | null)?.recordChangedAt;
  const [searchParams, setSearchParams] = useSearchParams();
  const listOnly = searchParams.get('view') === 'list';
  const [category, setCategory] = useState<RecordCategory | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [today] = useState(() => {
    const [year, month, day] = toSeoulDateKey(new Date().toISOString()).split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showAllDayRecords, setShowAllDayRecords] = useState(false);
  const [monthRecords, setMonthRecords] = useState<DailyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipientId) return;
    let isCurrent = true;
    setIsLoading(true);
    setShowAllDayRecords(false);
    setError(null);
    setMonthRecords([]);
    setTotalPages(0);
    const request = listOnly
      ? getRecords(selectedRecipientId, category || undefined, page)
      : getRecordsByMonth(selectedRecipientId, viewYear, viewMonth + 1, category || undefined);
    request.then(res => {
      if (isCurrent) { setMonthRecords(res.items); setTotalPages(res.pagination.totalPages); }
    })
      .catch(e => { if (isCurrent) setError(e instanceof Error ? e.message : '기록 불러오기 실패'); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [selectedRecipientId, viewYear, viewMonth, listOnly, category, page, recordChangedAt]);

  const recordUrl = (recordId: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('record', String(recordId));
    return `/records?${params.toString()}`;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedKey = toDateKey(viewYear, viewMonth, selectedDay);
  const selectedRecords = listOnly ? monthRecords : monthRecords.filter(r => toSeoulDateKey(r.recordedAt) === selectedKey);
  const visibleRecords = listOnly || showAllDayRecords ? selectedRecords : selectedRecords.slice(0, 3);
  const hasMore = !listOnly && !showAllDayRecords && selectedRecords.length > 3;
  const datesWithRecords = new Set(monthRecords.map(r => toSeoulDateKey(r.recordedAt)));

  const canWrite = user?.role === 'GUARDIAN' || user?.role === 'SUPPORT_WORKER';

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
        <h1>{listOnly ? '돌봄 기록 목록' : '생활기록'}</h1>
      </div>

      <div className={styles.categoryFilter}>
        <select aria-label="카테고리" value={category} onChange={event => {
          setCategory(event.target.value as RecordCategory | ''); setPage(1);
        }}>
          <option value="">전체</option>
          {Object.entries(CATEGORY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      {!listOnly && (
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

      )}

      {isLoading && <div role="status" aria-label="기록을 불러오는 중" data-testid="loading-skeleton"><Skeleton height={56} count={3} /></div>}
      {error && <p className="error" role="alert">{error}</p>}

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
            {listOnly ? '전체 기록' : `${viewMonth + 1}월 ${selectedDay}일 (${getWeekdayLabel(viewYear, viewMonth, selectedDay)})`}
          </h2>
          <button
            className={styles.viewAll}
            type="button"
            onClick={() => { setPage(1); setCategory(''); setSearchParams(listOnly ? {} : { view: 'list' }); }}
          >
            {listOnly ? '달력 보기' : '더보기 ›'}
          </button>
        </div>

        {!isLoading && !error && (selectedRecords.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>{listOnly ? '조회된 기록이 없어요.' : '이 날의 기록이 없어요.'}</p>
        ) : (
          <div className={styles.records}>
            {visibleRecords.map(record => (
              <Link key={record.id} to={recordUrl(record.id)} className={styles.recordCard}>
                <div
                  className={styles.recordIcon}
                  style={{ background: CATEGORY_COLOR[record.category] }}
                >
                  {CATEGORY_ICON[record.category]}
                </div>
                <p className={styles.recordContent}>{record.content}</p>
              </Link>
            ))}
            {hasMore && <button type="button" className={styles.viewAll} onClick={() => setShowAllDayRecords(true)}>
              기록 펼치기 ({selectedRecords.length - 3}개 더)
            </button>}
          </div>
        ))}
      </section>

      {listOnly && !isLoading && !error && totalPages > 1 && (
        <nav aria-label="기록 페이지" className={styles.pagination}>
          <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage(p => p - 1)}>이전</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages || isLoading} onClick={() => setPage(p => p + 1)}>다음</button>
        </nav>
      )}

      {canWrite && (
        <>
          <Link to="/records/deleted" className={styles.viewAll}>삭제된 기록 보기</Link>
          <button
            className={`btn ${styles.recordButton}`}
            type="button"
            onClick={() => navigate('/records/new')}
          >
            기록하기
          </button>
        </>
      )}
    </div>
  );
}
