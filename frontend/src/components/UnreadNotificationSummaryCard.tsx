import { useState } from 'react';
import { summarizeUnreadNotifications, type NotificationSummary } from '../api/notifications';
import styles from './UnreadNotificationSummaryCard.module.css';

export function UnreadNotificationSummaryCard({ onSummaryGenerated }: { onSummaryGenerated?: () => void }) {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await summarizeUnreadNotifications());
      onSummaryGenerated?.();
    } catch {
      setError(summary?.summary
        ? '새 요약을 만들지 못했어요. 이전 요약을 계속 보여드릴게요.'
        : '요약 리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={summary || loading || error ? styles.card : styles.action} aria-label="알림 요약">
      {summary?.unreadCount !== 0 && !summary?.summary && (
        <button className={styles.button} type="button" onClick={() => void generateSummary()} disabled={loading}>
          {loading ? '요약하는 중…' : '요약하기'}
        </button>
      )}
      {summary && summary.summary && (
        <div className={styles.result}>
          <p className={styles.count}>방금 요약한 알림 {summary.unreadCount}건</p>
          <p className={styles.summary}>{summary.summary}</p>
        </div>
      )}
      {summary && !summary.summary && (
        <p className={styles.status} role="status">미확인 알림이 없어요.</p>
      )}
      {loading && <p className={styles.status} role="status">알림 내용을 모아 요약하고 있어요. 잠시만 기다려 주세요.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
