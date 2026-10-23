import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';
import {
  getRecordSuggestions,
  decideRecordSuggestion,
  type RecordSuggestion,
} from '../api/records';
import type { CareRecipient } from '../types/careRecipient';
import { AppShell } from '../components/AppShell';
import styles from './RecordSuggestionsPage.module.css';

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

function formatDateTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

export function RecordSuggestionsPage() {
  const navigate = useNavigate();
  const { selectedRecipientId, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [recipients, setRecipients] = useState<CareRecipient[]>([]);
  const [currentRecipientId, setCurrentRecipientId] = useState<number | null>(selectedRecipientId);
  const [suggestions, setSuggestions] = useState<RecordSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 대상자 목록 로드
  useEffect(() => {
    listCareRecipients()
      .then((data) => {
        setRecipients(data);
        if (!currentRecipientId && data.length > 0) {
          setCurrentRecipientId(data[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '돌봄 대상자 정보를 불러오지 못했습니다.');
      });
  }, [currentRecipientId]);

  const recipient = recipients.find((r) => r.id === currentRecipientId);

  // 제안 목록 조회
  const loadSuggestions = useCallback(async () => {
    if (!currentRecipientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'PENDING') {
        const res = await getRecordSuggestions(currentRecipientId, 'PENDING');
        setSuggestions(res.items ?? []);
      } else {
        const [approvedRes, rejectedRes] = await Promise.all([
          getRecordSuggestions(currentRecipientId, 'APPROVED'),
          getRecordSuggestions(currentRecipientId, 'REJECTED'),
        ]);
        const combined = [...(approvedRes.items ?? []), ...(rejectedRes.items ?? [])];
        combined.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setSuggestions(combined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 제안 목록을 불러오지 못했습니다.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentRecipientId, activeTab]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // 승인/거절 처리
  const handleDecision = async (suggestionId: number, decision: 'APPROVE' | 'REJECT') => {
    if (!currentRecipientId) return;
    setProcessingId(suggestionId);
    setError(null);
    setStatusMessage(null);
    try {
      await decideRecordSuggestion(currentRecipientId, suggestionId, decision);
      setStatusMessage(
        decision === 'APPROVE'
          ? '수정 제안을 승인하여 생활기록에 반영했습니다.'
          : '수정 제안을 거절했습니다.'
      );
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AppShell role={user?.role}>
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/more')}
          aria-label="뒤로 가기"
        >
          <span aria-hidden="true">‹</span> 뒤로
        </button>
        <h1 className={styles.title}>수정 제안 검토</h1>
        <div className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <nav className={styles.tabList} role="tablist" aria-label="수정 제안 상태 탭">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PENDING'}
          className={`${styles.tabBtn} ${activeTab === 'PENDING' ? styles.active : ''}`}
          onClick={() => setActiveTab('PENDING')}
        >
          검토 대기
          {activeTab === 'PENDING' && suggestions.length > 0 && (
            <span className={styles.tabBadge}>{suggestions.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PROCESSED'}
          className={`${styles.tabBtn} ${activeTab === 'PROCESSED' ? styles.active : ''}`}
          onClick={() => setActiveTab('PROCESSED')}
        >
          처리 완료
        </button>
      </nav>

      <main className={styles.content}>
        {recipient && (
          <p className={styles.notice}>
            <strong>{recipient.name}</strong> 님의 생활기록에 제안된 수정 사항입니다.
          </p>
        )}

        {statusMessage && (
          <div className={`${styles.alertBox} ${styles.successAlert}`} role="status">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className={`${styles.alertBox} ${styles.errorAlert}`} role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.emptyState}>
            <p>목록을 불러오는 중입니다...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              className={styles.emptyIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>
              {activeTab === 'PENDING'
                ? '검토 대기 중인 수정 제안이 없습니다.'
                : '처리된 수정 제안 내역이 없습니다.'}
            </p>
          </div>
        ) : (
          suggestions.map((item) => {
            const originalText = item.original?.content ?? '';
            const proposedText = item.proposed?.content ?? item.suggestedContent ?? '';
            const origCategory = item.original?.category
              ? CATEGORY_LABEL[item.original.category] ?? item.original.category
              : null;
            const propCategory = item.proposed?.category
              ? CATEGORY_LABEL[item.proposed.category] ?? item.proposed.category
              : null;
            const authorName = item.suggestedBy?.name ?? '활동지원사';
            const isProcessing = processingId === item.id;

            return (
              <article key={item.id} className={styles.card} aria-labelledby={`suggestion-title-${item.id}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.authorInfo}>
                    <span id={`suggestion-title-${item.id}`} className={styles.authorName}>
                      {authorName}
                    </span>
                    <span className={styles.authorRole}>활동지원사 제안</span>
                  </div>
                  {item.createdAt && (
                    <span className={styles.metaInfo}>{formatDateTime(item.createdAt)}</span>
                  )}
                </div>

                {item.reason && (
                  <div className={styles.reasonBox}>
                    <span className={styles.reasonLabel}>제안 사유:</span>
                    <span>{item.reason}</span>
                  </div>
                )}

                <div className={styles.comparisonSection}>
                  <div className={`${styles.contentBlock} ${styles.originalBlock}`}>
                    <div className={styles.blockLabelRow}>
                      <span className={styles.blockLabel}>기존 원본</span>
                      {origCategory && <span className={styles.categoryTag}>{origCategory}</span>}
                    </div>
                    <p className={styles.contentText}>{originalText || '(내용 없음)'}</p>
                  </div>

                  <div className={`${styles.contentBlock} ${styles.proposedBlock}`}>
                    <div className={styles.blockLabelRow}>
                      <span className={styles.blockLabel}>수정 제안</span>
                      {propCategory && <span className={styles.categoryTag}>{propCategory}</span>}
                    </div>
                    <p className={styles.contentText}>{proposedText || '(내용 없음)'}</p>
                  </div>
                </div>

                {item.status === 'PENDING' ? (
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      disabled={isProcessing}
                      onClick={() => handleDecision(item.id, 'REJECT')}
                      aria-label="수정 제안 거절"
                    >
                      {isProcessing ? '처리 중...' : '거절'}
                    </button>
                    <button
                      type="button"
                      className={styles.approveBtn}
                      disabled={isProcessing}
                      onClick={() => handleDecision(item.id, 'APPROVE')}
                      aria-label="수정 제안 승인"
                    >
                      {isProcessing ? '처리 중...' : '승인'}
                    </button>
                  </div>
                ) : (
                  <span
                    className={`${styles.statusBadge} ${
                      item.status === 'APPROVED' ? styles.statusApproved : styles.statusRejected
                    }`}
                  >
                    {item.status === 'APPROVED' ? '승인됨' : '거절됨'}
                  </span>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
    </AppShell>
  );
}
