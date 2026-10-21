import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getSecondaryGuardian,
  inviteSecondaryGuardian,
  revokeSecondaryGuardian,
  type SecondaryGuardianResponse,
} from '../api/careRecipients';
import { AppShell } from '../components/AppShell';
import styles from './SecondaryGuardianPage.module.css';

export function SecondaryGuardianPage() {
  const { user, selectedRecipientId } = useAuth();
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

  const handleCopy = async (text: string, message: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setSuccess(message);
    } catch {
      setSuccess(`${text} (복사됨)`);
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId || !inviteeCode.trim() || submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await inviteSecondaryGuardian(selectedRecipientId, inviteeCode.trim());
      setSuccess('세컨드 보호자 초대를 전송했습니다. 초대 코드가 발급되었습니다.');
      setInviteeCode('');
      setSecondary(res);
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
    <AppShell role={user?.role}>
      <main className="demo-page">
        <div className="page-heading">
          <button
            type="button"
            className="back"
            onClick={() => navigate('/more')}
            aria-label="더보기로 돌아가기"
          >
            ←
          </button>
          <h1>세컨드 보호자 관리</h1>
        </div>

        <p className="hint">
          보호자 부재 또는 비상 상황에 대비해 동일한 권한을 가질 대리인을 지정할 수 있습니다.
        </p>

        {user?.publicCode && (
          <div className="demo-card accent" style={{ padding: '16px 20px', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="eyebrow" style={{ display: 'block', margin: 0 }}>내 보호자 고유 코드</span>
                <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.5px' }}>
                  {user.publicCode}
                </p>
              </div>
              <button
                type="button"
                className="btn secondary"
                style={{ minHeight: '38px', height: '38px', padding: '0 14px', fontSize: '13px', borderRadius: '8px' }}
                onClick={() => void handleCopy(user.publicCode!, '내 보호자 코드가 복사되었습니다.')}
              >
                코드 복사
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
              상대방이 나를 세컨드 보호자로 등록할 때 이 코드를 알려주세요.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="success">
            {success}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <p>세컨드 보호자 정보를 확인하는 중입니다…</p>
          </div>
        ) : secondary && secondary.status !== 'REVOKED' ? (
          <article className="demo-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', margin: 0 }}>지정된 세컨드 보호자</h2>
              <span
                className="tag"
                style={
                  secondary.status === 'ACTIVE'
                    ? {}
                    : { background: '#fff3e8', color: '#f57c00' }
                }
              >
                {secondary.status === 'ACTIVE' ? '지정 완료' : '초대 대기 중'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
              <p style={{ margin: 0 }}>
                <span className="muted">회원 식별 번호:</span> <strong>#{secondary.guardianId}</strong>
              </p>
              <p style={{ margin: 0 }}>
                <span className="muted">등록일시:</span> {new Date(secondary.createdAt).toLocaleDateString('ko-KR')}
              </p>
              {secondary.status === 'PENDING' && secondary.invitationExpiresAt && (
                <p style={{ margin: 0 }}>
                  <span className="muted">초대 만료 예정:</span>{' '}
                  {new Date(secondary.invitationExpiresAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>

            {secondary.status === 'PENDING' && secondary.invitationToken && (
              <div
                style={{
                  background: 'var(--soft)',
                  border: '1px solid #cde2d3',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="eyebrow" style={{ margin: 0 }}>발급된 초대 코드</span>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ minHeight: '34px', height: '34px', padding: '0 12px', fontSize: '12px', borderRadius: '6px' }}
                    onClick={() => void handleCopy(secondary.invitationToken!, '초대 코드가 복사되었습니다.')}
                  >
                    초대 코드 복사
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    color: 'var(--ink)',
                  }}
                >
                  {secondary.invitationToken}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
                  초대 대상자에게 이 초대 코드를 전달하여 등록을 완료하도록 안내해주세요.
                </p>
              </div>
            )}

            <div className="actions" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn secondary"
                style={{ color: '#e05555', borderColor: '#f5c6c4' }}
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting}
              >
                지정 해제
              </button>
            </div>
          </article>
        ) : (
          <>
            <div className="empty-state">
              <p style={{ margin: 0 }}>
                아직 지정된 세컨드 보호자가 없습니다.
                <br />
                보호자 코드를 입력하여 초대해보세요.
              </p>
            </div>

            <form className="demo-card demo-form" onSubmit={handleInvite}>
              <label>
                세컨드 보호자 초대
                <input
                  type="text"
                  placeholder="예: P-ABC12345"
                  value={inviteeCode}
                  onChange={(e) => setInviteeCode(e.target.value)}
                  required
                  disabled={submitting}
                  aria-label="초대할 보호자 고유 식별 코드"
                />
                <span className="muted">
                  초대할 상대방의 마이페이지에 표시된 고유 식별 코드를 입력하세요.
                </span>
              </label>

              <button
                type="submit"
                className="btn"
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
              <h2 id="modal-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                세컨드 보호자를 해제할까요?
              </h2>
              <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
                지정을 해제하면 해당 보호자는 더 이상 당사자의 돌봄 정보를 열람하거나 관리할 수 없습니다.
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ color: '#e05555', borderColor: '#f5c6c4' }}
                  onClick={handleRevoke}
                  disabled={submitting}
                >
                  {submitting ? '해제 중…' : '해제하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
