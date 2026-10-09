import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DailyRecordPage.module.css';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const MOCK_RECORDS: Record<string, { id: number; content: string; category: string }[]> = {
  '2026-10-08': [
    { id: 1, content: '조용한 공간에서 안정된 모습을 보였어요.', category: 'EMOTION' },
    { id: 2, content: '외출 전에 미리 알려주니 잘 따라왔어요.', category: 'SCHEDULE' },
  ],
  '2026-10-14': [
    { id: 3, content: '조용한 공간에서 안정된 모습을 보였어요.', category: 'EMOTION' },
  ],
  '2026-10-21': [
    { id: 4, content: '복약 시간에 맞춰 약을 드셨어요.', category: 'HEALTH' },
  ],
};

const CATEGORY_COLOR: Record<string, string> = {
  EMOTION: '#e8f5ee',
  SCHEDULE: '#e8f0fb',
  HEALTH: '#fff3e0',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  EMOTION: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4a4 4 0 00-2.8 6.8L11 14l2.8-3.2A4 4 0 0011 4z" fill="#3CAB7E" />
    </svg>
  ),
  SCHEDULE: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="18" height="15" rx="2" fill="#5b8dee" />
      <line x1="7" y1="2" x2="7" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="2" x2="15" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  HEALTH: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="8" y="3" width="6" height="16" rx="3" fill="#ff9800" transform="rotate(45 11 11)" />
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

export default function DailyRecordPage() {
  const navigate = useNavigate();
  const [today] = useState(() => new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedKey = toDateKey(viewYear, viewMonth, selectedDay);
  const selectedRecords = MOCK_RECORDS[selectedKey] ?? [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>생활기록</h1>
        <button className={styles.filterButton} type="button">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <line x1="2" y1="4" x2="14" y2="4" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4" y1="8" x2="12" y2="8" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="12" x2="10" y2="12" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          필터
        </button>
      </div>

      <section className={styles.calendarSection} aria-label="월별 캘린더">
        <div className={styles.monthNav}>
          <button onClick={prevMonth} type="button" aria-label="이전 달">‹</button>
          <span className={styles.monthLabel}>{viewYear}년 {viewMonth + 1}월</span>
          <button onClick={nextMonth} type="button" aria-label="다음 달">›</button>
        </div>

        <div className={styles.dayHeaders} role="row">
          {DAYS.map(d => (
            <span
              key={d}
              className={`${styles.dayHeader} ${d === '일' ? styles.sun : ''} ${d === '토' ? styles.sat : ''}`}
            >
              {d}
            </span>
          ))}
        </div>

        <div className={styles.grid} role="grid">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const key = toDateKey(viewYear, viewMonth, day);
            const hasRecord = key in MOCK_RECORDS;
            const isSelected = day === selectedDay;
            const weekday = new Date(viewYear, viewMonth, day).getDay();

            return (
              <button
                key={day}
                type="button"
                className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${weekday === 0 ? styles.sun : ''} ${weekday === 6 ? styles.sat : ''}`}
                onClick={() => setSelectedDay(day)}
                aria-label={`${viewMonth + 1}월 ${day}일${hasRecord ? ', 기록 있음' : ''}`}
                aria-pressed={isSelected}
              >
                {day}
                {hasRecord && <span className={styles.dot} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.recordSection}>
        <div className={styles.recordHeader}>
          <h2 className={styles.recordDate}>
            {viewMonth + 1}월 {selectedDay}일 ({getWeekdayLabel(viewYear, viewMonth, selectedDay)})
          </h2>
          <button className={styles.viewAll} type="button">더보기 ›</button>
        </div>

        {selectedRecords.length === 0 ? (
          <p className={styles.empty}>이 날의 기록이 없어요.</p>
        ) : (
          <div className={styles.records}>
            {selectedRecords.map(record => (
              <div key={record.id} className={styles.recordCard}>
                <div
                  className={styles.recordIcon}
                  style={{ background: CATEGORY_COLOR[record.category] }}
                >
                  {CATEGORY_ICON[record.category]}
                </div>
                <p className={styles.recordContent}>{record.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        className={styles.recordButton}
        type="button"
        onClick={() => navigate('/records/new')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        기록하기
      </button>
    </div>
  );
}
