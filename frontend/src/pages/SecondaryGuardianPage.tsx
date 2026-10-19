import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getSecondaryGuardian,
  inviteSecondaryGuardian,
  revokeSecondaryGuardian,
  type SecondaryGuardianResponse,
} from '../api/careRecipients';
import styles from './SecondaryGuardianPage.module.css';

export function SecondaryGuardianPage() {
  const { selectedRecipientId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [secondary, setSecondary] = useState<SecondaryGuardianResponse | null>(null);
  const [inviteeCode, setInviteeCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchSecondary = useCallback(async () => {
    if (!selectedRecipientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSecondaryGuardian(selectedRecipientId);
      setSecondary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '세컨드 보호자 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedRecipientId]);

  useEffect(() => {
    void fetchSecondary();
  }, [fetchSecondary]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !inviteeCode.trim() || submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await inviteSecondaryGuardian(selectedRecipientId, inviteeCode.trim());
      setSuccess('세컨드 보호자 초대를 전송했습니다.');
      setInviteeCode('');
      await fetchSecondary();
    } catch (e) {
      setError(e instanceof Error ? e.message : '초대 전송 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedRecipientId || submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await revokeSecondaryGuardian(selectedRecipientId);
      setSuccess('세컨드 보호자 지정이 해제되었습니다.');
      setShowConfirmModal(false);
      setSecondary(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '지정 해제 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/more')}
          aria-label="더보기로 돌아가기"
        >
          ‹ 뒤로
        </button>
        <h1 className={styles.title}>세컨드 보호자 관리</h1>
      </header>

      <div className={styles.infoBanner}>
        보호자 부재 또는 비상 상황에 대비해 동일한 권한을 가질 대리인을 지정할 수 있습니다.
      </div>

      {error && (
        <div role="alert" className={styles.alertError}>
          {error}
        </div>
      )}

      {success && (
        <div role="status" className={styles.alertSuccess}>
          {success}
        </div>
      )}

      {loading ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>세컨드 보호자 정보를 확인하는 중입니다…</p>
        </div>
      ) : secondary && secondary.status !== 'REVOKED' ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>지정된 세컨드 보호자</h2>
            <span
              className={`${styles.statusBadge} ${
                secondary.status === 'ACTIVE' ? styles.badgeActive : styles.badgePending
              }`}
            >
              {secondary.status === 'ACTIVE' ? '지정 완료' : '초대 대기 중'}
            </span>
          </div>

          <div className={styles.cardBody}>
            <div>
              <strong>회원 식별 번호:</strong> #{secondary.guardianId}
            </div>
            <div>
              <strong>등록일시:</strong> {new Date(secondary.createdAt).toLocaleDateString('ko-KR')}
            </div>
            {secondary.status === 'PENDING' && secondary.invitationExpiresAt && (
              <div>
                <strong>초대 만료 예정:</strong>{' '}
                {new Date(secondary.invitationExpiresAt).toLocaleString('ko-KR')}
              </div>
            )}
          </div>

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
            >
              지정 해제
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p className={styles.emptyText}>
              아직 지정된 세컨드 보호자가 없습니다.
              <br />
              보호자 코드를 입력하여 초대해보세요.
            </p>
          </div>

          <form className={styles.inviteForm} onSubmit={handleInvite}>
            <label className={styles.formLabel}>
              세컨드 보호자 초대
              <input
                type="text"
                className={styles.input}
                placeholder="예: USR-ABC1234"
                value={inviteeCode}
                onChange={(e) => setInviteeCode(e.target.value)}
                required
                disabled={submitting}
                aria-label="초대할 보호자 고유 식별 코드"
              />
              <span className={styles.inputHint}>
                초대할 상대방의 마이페이지에 표시된 고유 식별 코드를 입력하세요.
              </span>
            </label>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!inviteeCode.trim() || submitting}
            >
              {submitting ? '초대 보내는 중…' : '세컨드 보호자 초대하기'}
            </button>
          </form>
        </>
      )}

      {showConfirmModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={styles.modalContent}>
            <h3 id="modal-title" className={styles.modalTitle}>
              세컨드 보호자를 해제할까요?
            </h3>
            <p className={styles.modalDesc}>
              지정을 해제하면 해당 보호자는 더 이상 당사자의 돌봄 정보를 열람하거나 관리할 수 없습니다.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.modalBtnConfirm}
                onClick={handleRevoke}
                disabled={submitting}
              >
                {submitting ? '해제 중…' : '해제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
