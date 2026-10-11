import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DailyRecordPage.module.css';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const MOCK_RECORDS: Record<string, { id: number; content: string; category: string }[]> = {
  '2026-10-01': [
    { id: 10, content: '새로운 활동지원사와 첫 만남. 처음엔 경계했지만 이름을 반복해서 부르니 눈을 맞추기 시작했어요.', category: 'EMOTION' },
  ],
  '2026-10-03': [
    { id: 11, content: '복약 시간에 맞춰 리스페리돈 복용했어요.', category: 'HEALTH' },
    { id: 12, content: '점심 식사 전 손 씻기를 스스로 했어요.', category: 'MEAL' },
  ],
  '2026-10-06': [
    { id: 13, content: '오전 산책 중 큰 소리에 놀라 잠깐 멈췄지만 이름을 부르자 다시 걸음을 재개했어요.', category: 'EMOTION' },
    { id: 14, content: '좋아하는 동요를 틀어주니 기분이 많이 풀렸어요.', category: 'EMOTION' },
  ],
  '2026-10-08': [
    { id: 1, content: '조용한 공간에서 안정된 모습을 보였어요.', category: 'EMOTION' },
    { id: 2, content: '외출 전에 미리 알려주니 잘 따라왔어요.', category: 'SCHEDULE' },
  ],
  '2026-10-09': [
    { id: 15, content: '배변 활동 정상. 식이섬유 음식 잘 먹었어요.', category: 'HEALTH' },
  ],
  '2026-10-10': [
    { id: 16, content: '오늘 유독 말을 많이 하려 했어요. 좋아하는 색연필 꺼내주니 30분 넘게 그림 그렸어요.', category: 'EMOTION' },
    { id: 17, content: '단추 채우기를 처음으로 혼자 해냈어요!', category: 'SCHEDULE' },
  ],
  '2026-10-13': [
    { id: 18, content: '어제 새 장소에 미리 사진으로 설명해줬더니 오늘 외출 시 별 저항 없이 따라왔어요.', category: 'SCHEDULE' },
  ],
  '2026-10-14': [
    { id: 3, content: '조용한 공간에서 안정된 모습을 보였어요.', category: 'EMOTION' },
    { id: 19, content: '복약 정상. 저녁 식사도 잘 드셨어요.', category: 'HEALTH' },
  ],
  '2026-10-16': [
    { id: 20, content: '잠깐 자해 행동(손 물기) 나타났으나, 부드럽게 이름 부르고 좋아하는 노래 틀어주니 5분 내 진정됐어요.', category: 'EMOTION' },
  ],
  '2026-10-21': [
    { id: 4, content: '복약 시간에 맞춰 약을 드셨어요.', category: 'HEALTH' },
    { id: 21, content: '오늘 산책로를 살짝 바꿨는데 불안해했어요. 앞으로는 미리 변경 예고를 드리는 게 좋을 것 같아요.', category: 'SCHEDULE' },
  ],
};

const CATEGORY_COLOR: Record<string, string> = {
  EMOTION: '#e8f5ee',
  SCHEDULE: '#e8f0fb',
  HEALTH: '#fff3e0',
  MEAL: '#fff8e8',
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
  MEAL: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M7 3v6a4 4 0 004 4 4 4 0 004-4V3" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="11" y1="13" x2="11" y2="19" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
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
          <path d="M14 2.5l3.5 3.5L6 17.5H2.5V14L14 2.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        기록하기
      </button>
    </div>
  );
}
