import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getRecord,
  updateRecord,
  deleteRecord,
  getRecordRevisions,
} from '../api/records';
import { ConfirmDialog } from './ConfirmDialog';
import type { DailyRecord, RecordCategory, RecordRevision } from '../types/record';
import styles from './RecordDetailModal.module.css';

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

export function RecordDetailModal({ recordId, onClose, onChanged, onError }: {
  recordId: number;
  onClose: () => void;
  onChanged?: () => void;
  onError?: (message: string) => void;
}) {
  const { selectedRecipientId, user } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
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

  // 수정 이력 상태 (보호자/열람자용)
  const [revisions, setRevisions] = useState<RecordRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const scrollContainer = dialogRef.current?.closest<HTMLElement>('.app-main');
    const previousScrollOverflow = scrollContainer?.style.overflow;
    document.body.style.overflow = 'hidden';
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (scrollContainer) scrollContainer.style.overflow = previousScrollOverflow ?? '';
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (!selectedRecipientId || !Number.isInteger(recordId) || recordId <= 0) {
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    getRecord(selectedRecipientId, recordId)
      .then(res => { if (isCurrent) setRecord(res); })
      .catch(e => { if (isCurrent) setError(e instanceof Error ? e.message : '기록을 불러올 수 없어요.'); })
      .finally(() => { if (isCurrent) setIsLoading(false); });

    setRevisionsLoading(true);
    getRecordRevisions(selectedRecipientId, recordId)
      .then(res => { if (isCurrent) setRevisions(res?.items ?? []); })
      .catch(() => { if (isCurrent) setRevisions([]); })
      .finally(() => { if (isCurrent) setRevisionsLoading(false); });

    return () => { isCurrent = false; };
  }, [recordId, selectedRecipientId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (showDeleteDialog) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href]'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
    if (!selectedRecipientId) return;
    setShowDeleteDialog(false);
    setIsDeleting(true);
    setError(null);
    try {
      await deleteRecord(selectedRecipientId, recordId);
      onChanged?.();
      if (isMountedRef.current) onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록 삭제 중 오류가 발생했어요.';
      if (isMountedRef.current) {
        setError(message);
        setIsDeleting(false);
      } else onError?.(message);
    }
  };

  const submitEdit = async () => {
    if (!selectedRecipientId || !editContent.trim()) return;
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateRecord(selectedRecipientId, recordId, {
        content: editContent.trim(),
        category: editCategory,
      });
      onChanged?.();
      if (!isMountedRef.current) return;
      setRecord(updated);
      setIsEditing(false);
      setActionMsg('기록이 수정되었어요.');
      getRecordRevisions(selectedRecipientId, recordId)
        .then(res => { if (isMountedRef.current) setRevisions(res?.items ?? []); })
        .catch(() => {});
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록 수정 중 오류가 발생했어요.';
      if (isMountedRef.current) setEditError(message);
      else onError?.(message);
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const canEdit = (user?.role === 'GUARDIAN' || user?.role === 'SUPPORT_WORKER')
    && record?.author?.id === user.id;

  return (
    <div className={styles.backdrop} onMouseDown={event => { if (event.target === event.currentTarget && !showDeleteDialog) onClose(); }}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="record-detail-title" onKeyDown={handleKeyDown}>
      <ConfirmDialog open={showDeleteDialog} title="기록을 삭제할까요?"
        description="삭제 후 30일 동안 기록 목록에서 복원할 수 있습니다." confirmLabel="삭제" variant="danger"
        onConfirm={() => { void handleDelete(); }} onCancel={() => setShowDeleteDialog(false)} />
      <div className={styles.body}>
        <div className={styles.header}>
          <h2 id="record-detail-title">{isEditing ? '기록 수정' : '기록 상세'}</h2>
          <button ref={closeButtonRef} type="button" className={styles.close} onClick={onClose} aria-label="기록 상세 닫기">✕</button>
        </div>
        {isLoading ? <p className="empty-state" role="status">불러오는 중…</p> : error ? (
          <p className="error" role="alert">{error}</p>
        ) : !record ? (
          <p className="empty-state">기록을 찾을 수 없어요.</p>
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
                <article className="demo-card">
                  <time className="record-meta" dateTime={record.recordedAt}>
                    {new Date(record.recordedAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                  <span className="tag">{CATEGORY_LABEL[record.category] ?? record.category}</span>
                  <p className="record-content">{record.content}</p>
                </article>
                {actionMsg && <p role="status" className="hint">{actionMsg}</p>}
                {canEdit && (
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
      </div>
      </div>
    </div>
  );
}
