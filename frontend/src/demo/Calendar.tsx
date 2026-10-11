import { useState } from 'react';
import type { CareRecord } from './model';
export function Calendar({
  records,
  selected,
  onSelect,
}: {
  records: CareRecord[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = month.getFullYear(),
    m = month.getMonth(),
    count = new Date(year, m + 1, 0).getDate();
  const key = (day: number) =>
    `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return (
    <section className="demo-card accent" aria-label="월별 기록 달력">
      <div className="calendar-heading">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
        >
          ‹
        </button>
        <h2>
          {year}년 {m + 1}월
        </h2>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span
            className="muted"
            key={d}
            style={d === '일' ? { color: '#e05555' } : d === '토' ? { color: '#5b8dee' } : undefined}
          >
            {d}
          </span>
        ))}
        {Array.from({ length: month.getDay() }, (_, i) => (
          <span key={'empty' + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = key(i + 1),
            has = records.some((r) => r.date === date);
          const dow = (month.getDay() + i) % 7;
          const dayColor = dow === 0 ? '#e05555' : dow === 6 ? '#5b8dee' : undefined;
          return (
            <button
              type="button"
              key={date}
              aria-pressed={selected === date}
              aria-label={`${m + 1}월 ${i + 1}일${has ? ', 기록 있음' : ''}`}
              onClick={() => onSelect(date)}
              style={dayColor && selected !== date ? { color: dayColor } : undefined}
            >
              {i + 1}
              {has && <span aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
