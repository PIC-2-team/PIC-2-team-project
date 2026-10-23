import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getCareRelations,
  requestOrganizationLink,
  type CareRelationsResponse,
} from '../api/careRecipients';
import { AppShell } from '../components/AppShell';
import { ApiError } from '../api/client';
import styles from './CareRelationsPage.module.css';

export function CareRelationsPage() {
  const { selectedRecipientId, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CareRelationsResponse | null>(null);
  const [orgCode, setOrgCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRelations = useCallback(async () => {
    if (!selectedRecipientId) return;
    setData(null);
    setLoading(true);
    setError(null);
    try {
      const res = await getCareRelations(selectedRecipientId);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 && e.code === 'NOT_FOUND'
        ? '돌봄 관계 조회 기능이 서버에 반영되지 않았어요. 잠시 후 다시 시도해 주세요.'
        : e instanceof Error ? e.message : '돌봄 관계 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedRecipientId]);

  useEffect(() => {
    void fetchRelations();
  }, [fetchRelations]);

  const handleRequestLink = async (e: FormEvent) => {
    e.preventDefault();
    const code = orgCode.trim().toUpperCase();
    if (!selectedRecipientId || !code || submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await requestOrganizationLink(selectedRecipientId, code);
      setSuccess('기관 연결 요청을 전송했습니다. 기관 승인 후 연동됩니다.');
      setOrgCode('');
      await fetchRelations();
    } catch (e) {
      setError(e instanceof Error ? e.message : '기관 연결 요청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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
          aria-label="더보기로 돌아가기"
        >
          ‹ 뒤로
        </button>
        <h1 className={styles.title}>돌봄 관계 관리</h1>
      </header>

      <div className={styles.infoBanner}>
        연결된 기관과 배정된 활동지원사 현황을 확인하고, 새 기관 연결을 요청할 수 있습니다.
      </div>

      {error && (
        <div role="alert" className={styles.alertError}>
          <p>{error}</p>
          {!loading && !data && <button type="button" className={styles.retryButton} onClick={() => void fetchRelations()}>다시 불러오기</button>}
        </div>
      )}

      {success && (
        <div role="status" className={styles.alertSuccess}>
          {success}
        </div>
      )}

      {loading ? (
        <div className={styles.emptyCard}>
          <p>돌봄 관계 정보를 불러오는 중입니다…</p>
        </div>
      ) : data ? (
        <>
          {/* 소속 기관 섹션 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              연결 기관 ({data?.organizations.length ?? 0}곳)
            </h2>
            {data?.organizations && data.organizations.length > 0 ? (
              data.organizations.map((org) => (
                <div key={org.linkId} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardName}>{org.organizationName}</h3>
                    <span
                      className={`${styles.statusBadge} ${
                        org.status === 'ACCEPTED'
                          ? styles.badgeAccepted
                          : org.status === 'PENDING'
                            ? styles.badgePending
                            : styles.badgeRejected
                      }`}
                    >
                      {org.status === 'ACCEPTED'
                        ? '연결 완료'
                        : org.status === 'PENDING'
                          ? '승인 대기'
                          : '연결 거절'}
                    </span>
                  </div>
                  <p className={styles.cardMeta}>기관 코드 · {org.organizationCode}</p>
                  <p className={styles.cardMeta}>
                    요청일시 · {new Date(org.requestedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))
            ) : (
              <div className={styles.emptyCard}>아직 연결된 기관이 없습니다.</div>
            )}
          </section>

          {/* 배정된 활동지원사 섹션 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              배정된 활동지원사 ({data?.assignments.length ?? 0}명)
            </h2>
            {data?.assignments && data.assignments.length > 0 ? (
              data.assignments.map((worker) => (
                <div key={worker.assignmentId} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardName}>{worker.supportWorkerName} 지원사</h3>
                    <span className={`${styles.statusBadge} ${styles.badgeAccepted}`}>
                      배정 중
                    </span>
                  </div>
                  <p className={styles.cardMeta}>소속 · {worker.organizationName}</p>
                  <p className={styles.cardMeta}>
                    배정 기간 · {new Date(worker.startDate).toLocaleDateString('ko-KR')} ~{' '}
                    {worker.endDate
                      ? new Date(worker.endDate).toLocaleDateString('ko-KR')
                      : '종료일 없음'}
                  </p>
                </div>
              ))
            ) : (
              <div className={styles.emptyCard}>현재 배정된 활동지원사가 없습니다.</div>
            )}
          </section>
        </>
      ) : null}

      {/* 신규 기관 연결 요청 폼 */}
      {!loading && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>새 기관 연결 요청</h2>
          <form className={styles.linkForm} onSubmit={handleRequestLink}>
            <label className={styles.formLabel}>
              기관 코드 입력
              <input
                type="text"
                className={styles.input}
                placeholder="예: KNU001"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                required
                disabled={submitting}
                aria-label="연결할 기관 코드"
              />
              <span className={styles.inputHint}>
                연결하고자 하는 복지관 또는 돌봄 기관의 코드를 입력하세요.
              </span>
            </label>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={!orgCode.trim() || submitting}
            >
              {submitting ? '요청 보내는 중…' : '기관 연결 요청하기'}
            </button>
          </form>
        </section>
      )}
    </div>
    </AppShell>
  );
}
