import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RecordFormPage.module.css';

const CATEGORIES = [
  { id: 'EMOTION', label: '감정' },
  { id: 'SCHEDULE', label: '일정' },
  { id: 'HEALTH', label: '건강·복약' },
  { id: 'MEAL', label: '식사' },
  { id: 'SLEEP', label: '수면' },
  { id: 'ETC', label: '기타' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function RecordFormPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId>('EMOTION');
  const [content, setContent] = useState('');

  const canSave = content.trim().length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.title}>기록 작성</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.body}>
        <p className={styles.dateLabel}>{formatToday()}</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>유형</h2>
          <div className={styles.chips} role="group" aria-label="기록 유형 선택">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.chip} ${category === cat.id ? styles.chipActive : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>내용</h2>
          <textarea
            className={styles.textarea}
            placeholder="오늘 있었던 일을 기록해주세요."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            maxLength={500}
          />
          <p className={styles.charCount}>{content.length} / 500</p>
        </section>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.saveButton}
          disabled={!canSave}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
