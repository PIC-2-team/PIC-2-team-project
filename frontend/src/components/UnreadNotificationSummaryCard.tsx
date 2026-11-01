import { useState } from 'react';
import { summarizeUnreadNotifications, type NotificationSummary } from '../api/notifications';
import styles from './UnreadNotificationSummaryCard.module.css';

export function UnreadNotificationSummaryCard() {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await summarizeUnreadNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : '요약을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="unread-summary-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>알림 정리</p>
          <h2 id="unread-summary-title" className={styles.title}>AI 미확인 알림 요약</h2>
        </div>
      </div>
      <p className={styles.description}>아직 확인하지 않은 알림의 핵심 내용을 빠르게 확인해요.</p>
      {summary && summary.summary && (
        <div className={styles.result}>
          <p className={styles.count}>미확인 알림 {summary.unreadCount}건</p>
          <p className={styles.summary}>{summary.summary}</p>
        </div>
      )}
      {summary && !summary.summary && (
        <p className={styles.status} role="status">확인하지 않은 알림이 없어요.</p>
      )}
      {loading && <p className={styles.status} role="status">알림을 요약하고 있어요…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.button} type="button" onClick={() => void generateSummary()} disabled={loading}>
        {loading ? '요약하는 중…' : summary?.summary ? '다시 요약하기' : '미확인 알림 요약하기'}
      </button>
      <p className={styles.note}>요약을 확인해도 알림의 읽음 상태는 바뀌지 않아요.</p>
    </section>
  );
}
