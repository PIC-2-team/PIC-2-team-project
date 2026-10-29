import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDeletedRecords, restoreRecord } from '../api/records';
import { useAuth } from '../contexts/AuthContext';
import type { DeletedRecord } from '../types/record';
import styles from './DailyRecordPage.module.css';

export function DeletedRecordsPage() {
  const { selectedRecipientId } = useAuth();
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!selectedRecipientId) return;
    let current = true;
    setLoading(true);
    setError(null);
    getDeletedRecords(selectedRecipientId, page)
      .then(result => {
        if (!current) return;
        if (page > 1 && result.items.length === 0) {
          setPage(page - 1);
          return;
        }
        setRecords(result.items);
        setTotalPages(result.pagination.totalPages);
      })
      .catch(e => { if (current) setError(e instanceof Error ? e.message : '삭제된 기록을 불러오지 못했어요.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [selectedRecipientId, page, refresh]);

  const restore = async (recordId: number) => {
    if (!selectedRecipientId) return;
    setRestoringId(recordId);
    setError(null);
    setMessage(null);
    try {
      await restoreRecord(selectedRecipientId, recordId);
      setMessage('기록을 복원했어요.');
      setRefresh(value => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록을 복원하지 못했어요.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <main className="demo-page">
      <h1>삭제된 기록</h1>
      <p className="muted">내가 삭제한 기록은 삭제 후 30일 동안 복원할 수 있어요.</p>
      <Link to="/records" className={styles.viewAll}>← 기록 목록으로</Link>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {loading ? <p role="status">불러오는 중…</p> : !error && records.length === 0 ? (
        <p className="muted">복원할 수 있는 기록이 없어요.</p>
      ) : (
        <div className={styles.records}>
          {records.map(record => (
            <article key={record.id} className={styles.recordCard}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className={styles.recordContent}>{record.content}</p>
                <small className="muted">복원 기한: {new Date(record.restoreUntil).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</small>
              </div>
              <button type="button" className="btn secondary" disabled={restoringId !== null}
                onClick={() => { void restore(record.id); }}>복원</button>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && totalPages > 1 && (
        <nav aria-label="삭제된 기록 페이지" className={styles.pagination}>
          <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>이전</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>다음</button>
        </nav>
      )}
    </main>
  );
}
