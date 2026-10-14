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

  if (isLoading) return <main style={{ padding: '2rem' }}><p>불러오는 중…</p></main>;
  if (error) return (
    <main style={{ padding: '2rem' }}>
      <p role="alert">{error}</p>
      <Link to="/records">← 목록으로</Link>
    </main>
  );
  if (!record) return (
    <main style={{ padding: '2rem' }}>
      <p>기록을 찾을 수 없어요.</p>
      <Link to="/records">← 목록으로</Link>
    </main>
  );

  return (
    <main style={{ maxWidth: 390, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}
        aria-label="뒤로가기"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <p style={{ fontSize: '0.8125rem', color: '#8a9ab0', margin: '0 0 0.5rem' }}>
        {CATEGORY_LABEL[record.category] ?? record.category}
      </p>
      <time style={{ fontSize: '0.875rem', color: '#8a9ab0', display: 'block', marginBottom: '1rem' }}>
        {new Date(record.recordedAt).toLocaleString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </time>
      <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#1a2533', whiteSpace: 'pre-wrap' }}>
        {record.content}
      </p>

      {actionMsg && (
        <p role="alert" style={{ marginTop: '1rem', color: '#c0392b', fontSize: '0.875rem' }}>
          {actionMsg}
        </p>
      )}

      {user?.role === 'GUARDIAN' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          {/* TODO: PATCH API 확정 후 연결 — 현재 미구현 */}
          <button
            type="button"
            onClick={() => setActionMsg('기록 수정은 현재 준비 중이에요.')}
            style={{ flex: 1, padding: '0.875rem', border: '1.5px solid #3CAB7E', borderRadius: '8px', background: 'white', color: '#3CAB7E', fontWeight: 600, cursor: 'pointer' }}
          >
            수정
          </button>
          {/* TODO: DELETE API 확정 후 연결 */}
          <button
            type="button"
            disabled
            style={{ flex: 1, padding: '0.875rem', border: '1.5px solid #b8c4ce', borderRadius: '8px', background: 'white', color: '#b8c4ce', fontWeight: 600, cursor: 'not-allowed' }}
          >
            삭제 (준비 중)
          </button>
        </div>
      )}

      {user?.role === 'CAREGIVER' && (
        /* TODO: 수정 제안 POST API (M7) 확정 후 연결 */
        <button
          type="button"
          disabled
          style={{ marginTop: '2rem', width: '100%', padding: '0.875rem', border: '1.5px solid #b8c4ce', borderRadius: '8px', background: 'white', color: '#b8c4ce', fontWeight: 600, cursor: 'not-allowed' }}
        >
          수정 제안 (준비 중)
        </button>
      )}
    </main>
  );
}
