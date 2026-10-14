import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createRecord } from '../api/records';
import type { RecordCategory } from '../types/record';
import styles from './RecordFormPage.module.css';

const CATEGORIES: { id: RecordCategory; label: string }[] = [
  { id: 'COMMUNICATION', label: '의사소통' },
  { id: 'LIFESTYLE', label: '생활습관' },
  { id: 'MEAL', label: '식사' },
  { id: 'PREFERENCE', label: '선호·비선호' },
  { id: 'CHALLENGING_BEHAVIOR', label: '도전행동' },
  { id: 'HEALTH', label: '건강·복약' },
  { id: 'EMERGENCY', label: '위기대처' },
  { id: 'OTHER', label: '기타' },
];

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function RecordFormPage() {
  const { selectedRecipientId } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<RecordCategory>('OTHER');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = content.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    if (!selectedRecipientId) {
      setError('당사자 정보가 없어요. 홈으로 돌아가 다시 시도해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRecord(selectedRecipientId, {
        content: content.trim(),
        category,
        recordedAt: new Date().toISOString(),
      });
      navigate('/records');
    } catch (e) {
      // 실패해도 content/category 유지
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

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

        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.saveButton}
          disabled={!canSave}
          onClick={() => { void handleSave(); }}
        >
          {saving ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
