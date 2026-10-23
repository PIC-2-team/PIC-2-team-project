import { AppShell } from '../components/AppShell';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getRecord,
  updateRecord,
  deleteRecord,
  createSuggestion,
  getRecordRevisions,
  getRecordSuggestions,
  type RecordSuggestion,
} from '../api/records';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { DailyRecord, RecordCategory, RecordRevision } from '../types/record';

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

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // 기록 수정 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<RecordCategory>('OTHER');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 기록 삭제 상태
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 수정 제안 상태 (활동지원사용)
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestionDone, setSuggestionDone] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // 수정 이력 상태 (보호자/열람자용)
  const [revisions, setRevisions] = useState<RecordRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);

  // 해당 기록에 대한 대기 중인 활동지원사 수정 제안 목록
  const [pendingSuggestions, setPendingSuggestions] = useState<RecordSuggestion[]>([]);
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0);

  useEffect(() => {
    if (!selectedRecipientId || !id) {
      setIsLoading(false);
      return;
    }
    const recordId = Number(id);
    getRecord(selectedRecipientId, recordId)
      .then(setRecord)
      .catch(e => setError(e instanceof Error ? e.message : '기록을 불러올 수 없어요.'))
      .finally(() => setIsLoading(false));

    setRevisionsLoading(true);
    getRecordRevisions(selectedRecipientId, recordId)
      .then(res => setRevisions(res?.items ?? []))
      .catch(() => setRevisions([]))
      .finally(() => setRevisionsLoading(false));

    if (user?.role === 'GUARDIAN') {
      getRecordSuggestions(selectedRecipientId, 'PENDING', 1, 20, recordId)
        .then(res => {
          setPendingSuggestions(res?.items ?? []);
          setPendingSuggestionCount(res?.pagination.totalItems ?? 0);
        })
        .catch(() => {
          setPendingSuggestions([]);
          setPendingSuggestionCount(0);
        });
    }
  }, [id, selectedRecipientId, user?.role]);

  const startEditing = () => {
    if (!record) return;
    setEditContent(record.content);
    setEditCategory(record.category);
    setEditError(null);
    setActionMsg(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleDelete = async () => {
    if (!selectedRecipientId || !id) return;
    setShowDeleteDialog(false);
    setIsDeleting(true);
    setError(null);
    try {
      await deleteRecord(selectedRecipientId, Number(id));
      navigate('/records', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록 삭제 중 오류가 발생했어요.');
      setIsDeleting(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedRecipientId || !id || !editContent.trim()) return;
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateRecord(selectedRecipientId, Number(id), {
        content: editContent.trim(),
        category: editCategory,
      });
      setRecord(updated);
      setIsEditing(false);
      setActionMsg('기록이 수정되었어요.');
      getRecordRevisions(selectedRecipientId, Number(id))
        .then(res => setRevisions(res?.items ?? []))
        .catch(() => {});
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '기록 수정 중 오류가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitSuggestion = async () => {
    if (!selectedRecipientId || !id || !suggestionText.trim()) return;
    setSubmitting(true);
    setSuggestionError(null);
    try {
      await createSuggestion(selectedRecipientId, Number(id), suggestionText.trim());
      setSuggestionDone(true);
      setShowSuggestion(false);
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : '제안 제출 중 오류가 발생했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell role={user?.role}>
      <ConfirmDialog open={showDeleteDialog} title="기록을 삭제할까요?"
        description="삭제 후 되돌릴 수 없습니다." confirmLabel="삭제" variant="danger"
        onConfirm={() => { void handleDelete(); }} onCancel={() => setShowDeleteDialog(false)} />
      <main className="demo-page">
        <div className="page-heading">
          <button type="button" className="back" onClick={() => navigate(-1)} aria-label="뒤로가기">←</button>
          <h1>{isEditing ? '기록 수정' : '기록 상세'}</h1>
        </div>
        {isLoading ? <p className="empty-state" role="status">불러오는 중…</p> : error ? (
          <><p className="error" role="alert">{error}</p><Link className="btn secondary" to="/records">← 목록으로</Link></>
        ) : !record ? (
          <><p className="empty-state">기록을 찾을 수 없어요.</p><Link className="btn secondary" to="/records">← 목록으로</Link></>
        ) : (
          <>
            {isEditing ? (
              <>
                <article className="demo-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label htmlFor="edit-category" style={{ fontSize: '0.875rem', fontWeight: 600 }}>기록 분류</label>
                    <div id="edit-category" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="group" aria-label="기록 분류 선택">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          aria-pressed={editCategory === cat.id}
                          className={`tag ${editCategory === cat.id ? 'active' : ''}`}
                          style={{
                            cursor: 'pointer',
                            border: editCategory === cat.id ? '1.5px solid var(--green, #3CAB7E)' : '1px solid #d1d5db',
                            background: editCategory === cat.id ? '#e8f5ee' : '#fff',
                            color: editCategory === cat.id ? '#23694c' : '#4b5563',
                            fontWeight: editCategory === cat.id ? 700 : 500,
                            borderRadius: '16px',
                            padding: '6px 12px',
                          }}
                          onClick={() => setEditCategory(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <label htmlFor="edit-content" style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem' }}>기록 내용</label>
                    <textarea
                      id="edit-content"
                      aria-label="기록 내용 수정"
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={5}
                      maxLength={500}
                      placeholder="기록 내용을 입력해 주세요."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <p style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                      {editContent.length} / 500
                    </p>
                  </div>
                </article>

                {editError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{editError}</p>}

                <div className="actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isSaving}
                    onClick={cancelEditing}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!editContent.trim() || isSaving}
                    onClick={() => { void submitEdit(); }}
                  >
                    {isSaving ? '저장 중…' : '저장'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {user?.role === 'GUARDIAN' && pendingSuggestionCount > 0 && (
                  <aside
                    aria-label="활동지원사 수정 제안"
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #f59e0b',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#b45309', fontSize: '0.95rem' }}>
                        📢 활동지원사의 수정 제안이 {pendingSuggestionCount}건 있어요
                      </strong>
                      <Link
                        to="/record-suggestions"
                        className="btn secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px', textDecoration: 'none' }}
                      >
                        검토하기
                      </Link>
                    </div>
                    {pendingSuggestions.map(sug => (
                      <div
                        key={sug.id}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.625rem',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #fde68a',
                          fontSize: '0.875rem',
                        }}
                      >
                        <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#4b5563' }}>
                          {sug.suggestedBy?.name ?? '활동지원사'} 님의 제안
                          {sug.reason && <span style={{ fontWeight: 400, color: '#6b7280' }}> · 사유: {sug.reason}</span>}
                        </p>
                        <p style={{ margin: 0, color: '#1f2937', whiteSpace: 'pre-wrap' }}>
                          {sug.proposed?.content ?? sug.suggestedContent}
                        </p>
                      </div>
                    ))}
                  </aside>
                )}

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
                    <button type="button" className="btn secondary" onClick={startEditing}>수정</button>
                    <button
                      type="button"
                      className="btn secondary danger"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      {isDeleting ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                )}
                {user?.role === 'SUPPORT_WORKER' && (
                  <>
                    {suggestionDone ? (
                      <p role="status">제안 전송 완료 — 보호자에게 전달됐어요.</p>
                    ) : showSuggestion ? (
                      <div>
                        <textarea
                          aria-label="수정 제안 내용"
                          value={suggestionText}
                          onChange={e => setSuggestionText(e.target.value)}
                          rows={4}
                          placeholder="수정할 내용을 입력해 주세요."
                        />
                        <div className="actions">
                          <button type="button" className="btn secondary" onClick={() => setShowSuggestion(false)}>취소</button>
                          <button
                            type="button"
                            className="btn primary"
                            disabled={!suggestionText.trim() || submitting}
                            onClick={() => { void submitSuggestion(); }}
                          >
                            {submitting ? '제출 중…' : '제안하기'}
                          </button>
                        </div>
                        {suggestionError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{suggestionError}</p>}
                      </div>
                    ) : (
                      <button type="button" className="btn secondary" onClick={() => setShowSuggestion(true)}>수정 제안</button>
                    )}
                  </>
                )}

                <section style={{ marginTop: '1.5rem' }} aria-labelledby="revisions-heading">
                  <button
                    type="button"
                    className="btn secondary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.625rem 1rem',
                      fontSize: '0.9rem',
                    }}
                    onClick={() => setShowRevisions(!showRevisions)}
                    aria-expanded={showRevisions}
                    aria-controls="revisions-list"
                  >
                    <span id="revisions-heading">
                      수정 내역 및 이력 {revisions.length > 0 ? `(${revisions.length}건)` : ''}
                    </span>
                    <span aria-hidden="true">{showRevisions ? '▲ 접기' : '▼ 펼치기'}</span>
                  </button>

                  {showRevisions && (
                    <div
                      id="revisions-list"
                      style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.625rem',
                      }}
                    >
                      {revisionsLoading ? (
                        <p className="hint">수정 이력을 불러오는 중입니다...</p>
                      ) : revisions.length === 0 ? (
                        <p className="hint">기록된 수정 내역이 없습니다.</p>
                      ) : (
                        revisions.map((rev) => (
                          <article
                            key={rev.revision}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              background: '#f9fafb',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginBottom: '0.375rem',
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>
                                #{rev.revision}차 수정 · {rev.changedBy.name} ({
                                  rev.changedBy.role === 'SUPPORT_WORKER'
                                    ? '활동지원사'
                                    : rev.changedBy.role === 'GUARDIAN'
                                    ? '돌봄 보호자'
                                    : rev.changedBy.role
                                })
                              </span>
                              <time dateTime={rev.changedAt}>
                                {new Date(rev.changedAt).toLocaleString('ko-KR', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </time>
                            </div>
                            <span
                              className="tag"
                              style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' }}
                            >
                              {CATEGORY_LABEL[rev.category] ?? rev.category}
                            </span>
                            <p
                              style={{
                                marginTop: '0.5rem',
                                marginBottom: 0,
                                fontSize: '0.875rem',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.5,
                              }}
                            >
                              {rev.content}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
