import { AppShell } from '../components/AppShell';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRecord } from '../api/records';
import type { DailyRecord } from '../types/record';

const CATEGORY_LABEL: Record<string, string> = {
  COMMUNICATION: '의사소통',
  LIFESTYLE: '생활습관',
  MEAL: '식사',
  PREFERENCE: '선호·비선호',
  CHALLENGING_BEHAVIOR: '도전행동',
  HEALTH: '건강·복약',
  EMERGENCY: '위기대처',
  OTHER: '기타',
};

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipientId || !id) {
      setIsLoading(false);
      return;
    }
    getRecord(selectedRecipientId, Number(id))
      .then(setRecord)
      .catch(e => setError(e instanceof Error ? e.message : '기록을 불러올 수 없어요.'))
      .finally(() => setIsLoading(false));
  }, [id, selectedRecipientId]);

  return (
    <AppShell role={user?.role}>
      <main className="demo-page">
        <div className="page-heading">
          <button type="button" className="back" onClick={() => navigate(-1)} aria-label="뒤로가기">←</button>
          <h1>기록 상세</h1>
        </div>
        {isLoading ? <p className="empty-state" role="status">불러오는 중…</p> : error ? (
          <><p className="error" role="alert">{error}</p><Link className="btn secondary" to="/records">← 목록으로</Link></>
        ) : !record ? (
          <><p className="empty-state">기록을 찾을 수 없어요.</p><Link className="btn secondary" to="/records">← 목록으로</Link></>
        ) : (
          <>
            <article className="demo-card">
              <time className="record-meta" dateTime={record.recordedAt}>
                {new Date(record.recordedAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </time>
              <span className="tag">{CATEGORY_LABEL[record.category] ?? record.category}</span>
              <p className="record-content">{record.content}</p>
            </article>
            {actionMsg && <p role="status" className="hint">{actionMsg}</p>}
            {user?.role === 'GUARDIAN' && (
              <div className="actions">
                <button type="button" className="btn secondary" onClick={() => setActionMsg('기록 수정은 현재 준비 중이에요.')}>수정</button>
                <button type="button" className="btn secondary" disabled>삭제 (준비 중)</button>
              </div>
            )}
            {user?.role === 'SUPPORT_WORKER' && <button type="button" className="btn secondary" disabled>수정 제안 (준비 중)</button>}
          </>
        )}
      </main>
    </AppShell>
  );
}
