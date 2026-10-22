import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';
import { createRecordRequest, getMyRecordRequests, cancelRecordRequest } from '../api/records';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { RecordRequestItem } from '../types/record';
import styles from './RecordRequestPage.module.css';

export function RecordRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRecipientId } = useAuth();

  const [recipientName, setRecipientName] = useState<string>('당사자');
  const categoryLabel = (location.state as { categoryLabel?: string })?.categoryLabel;

  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<RecordRequestItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRecipientId) return;
    let isMounted = true;
    listCareRecipients()
      .then(list => {
        if (!isMounted) return;
        const found = list.find(r => r.id === selectedRecipientId);
        if (found) setRecipientName(found.name);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [selectedRecipientId]);

  useEffect(() => {
    if (activeTab === 'HISTORY' && selectedRecipientId) {
      loadHistory();
    }
  }, [activeTab, selectedRecipientId]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const data = await getMyRecordRequests();
      const filtered = selectedRecipientId
        ? data.filter(item => item.careRecipientId === selectedRecipientId)
        : data;
      setHistory(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 내역을 불러오지 못했어요.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      setError('당사자가 선택되지 않았습니다.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError('요청 내용을 입력해 주세요.');
      return;
    }
    if (trimmed.length > 500) {
      setError('요청 내용은 500자 이내로 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createRecordRequest(selectedRecipientId, trimmed);
      setSubmitSuccess(true);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정 요청 전송에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (requestId: number) => {
    setCancelTarget(requestId);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedRecipientId || cancelTarget === null) return;
    setShowCancelDialog(false);
    setCancellingId(cancelTarget);
    setCancelError(null);
    try {
      await cancelRecordRequest(selectedRecipientId, cancelTarget);
      await loadHistory();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : '요청 취소에 실패했어요.');
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  const getStatusBadge = (status: RecordRequestItem['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className={`${styles.statusBadge} ${styles.statusPending}`}>검토 대기</span>;
      case 'COMPLETED':
        return <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>반영 완료</span>;
      case 'CANCELLED':
        return <span className={`${styles.statusBadge} ${styles.statusCancelled}`}>취소됨</span>;
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
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.title}>돌봄 내용 수정 요청</h1>
        <div className={styles.headerRight} />
      </header>

      <nav className={styles.tabs} aria-label="요청 메뉴">
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'NEW' ? styles.tabActive : ''}`}
          onClick={() => { setActiveTab('NEW'); setSubmitSuccess(false); }}
        >
          수정 요청 작성
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'HISTORY' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          보낸 요청 내역
        </button>
      </nav>

      <div className={styles.body}>
        {activeTab === 'NEW' ? (
          submitSuccess ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>수정 요청을 보냈어요</h2>
              <p className={styles.successDesc}>
                {recipientName}님의 돌봄 보호자에게 요청이 직접 전달되었습니다.<br />
                보호자가 확인 후 돌봄 내용을 갱신하게 됩니다.
              </p>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setSubmitSuccess(false)}
                >
                  새로운 요청 작성
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setActiveTab('HISTORY')}
                >
                  보낸 요청 확인
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.infoCard}>
                <span className={styles.directBadge}>보호자 직통 전달</span>
                <h2 className={styles.recipientTitle}>{recipientName}님</h2>
                <p className={styles.infoDesc}>
                  활동지원사님의 요청은 기관을 거치지 않고 돌봄 보호자에게 다이렉트로 전달됩니다.
                  현장에서 관찰한 점이나 수정이 필요한 내용을 상세히 적어주세요.
                </p>
                {categoryLabel && (
                  <span className={styles.categoryNotice}>
                    📌 [{categoryLabel}] 항목 관련 요청
                  </span>
                )}
              </div>

              <div className={styles.formCard}>
                <label htmlFor="request-message" className={styles.label}>
                  수정 요청 내용
                </label>
                <textarea
                  id="request-message"
                  aria-label="수정 요청 내용"
                  className={styles.textarea}
                  rows={5}
                  maxLength={500}
                  placeholder="보호자 분께 요청할 돌봄 내용이나 변경 사항을 입력해 주세요. (예: 최근 낮 시간대 불안 행동이 관찰되어 식사 후 산책 루틴을 추가해 주시면 좋겠습니다.)"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={isSubmitting}
                />
                <div className={styles.textMeta}>
                  <span>{message.length} / 500자</span>
                </div>
              </div>

              {error && (
                <p className="error" role="alert" style={{ margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={!message.trim() || isSubmitting}
              >
                {isSubmitting ? '전송 중…' : '수정 요청 보내기'}
              </button>
            </form>
          )
        ) : (
          <div className={styles.historyList}>
            {loadingHistory && <p className="muted" role="status">내역을 불러오는 중…</p>}
            {error && <p className="error" role="alert">{error}</p>}
            {!loadingHistory && history.length === 0 && (
              <div className={styles.emptyState}>
                <p>아직 보낸 돌봄 내용 수정 요청이 없어요.</p>
              </div>
            )}
            {history.map(item => (
              <article key={item.id} className={styles.historyCard}>
                <div className={styles.cardHeader}>
                  {getStatusBadge(item.status)}
                  <time className={styles.cardDate}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <p className={styles.cardMessage}>{item.message}</p>
                {item.status === 'PENDING' && (
                  <div className={styles.cancelAction}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      disabled={cancellingId === item.id}
                      onClick={() => handleCancel(item.id)}
                    >
                      {cancellingId === item.id ? '취소 중…' : '요청 취소'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {cancelError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{cancelError}</p>}
        <ConfirmDialog
          open={showCancelDialog}
          title="요청을 취소할까요?"
          confirmLabel="확인"
          cancelLabel="닫기"
          variant="danger"
          onConfirm={() => { void handleCancelConfirm(); }}
          onCancel={() => { setShowCancelDialog(false); setCancelTarget(null); }}
        />
      </div>
    </div>
  );
}

export default RecordRequestPage;
