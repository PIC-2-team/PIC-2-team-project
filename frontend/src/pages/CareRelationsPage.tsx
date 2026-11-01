import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
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

  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

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

  useEffect(() => () => { stopStream(); }, []);

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

  const stopStream = () => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const closeScanner = () => {
    stopStream();
    setShowScanner(false);
    setScanError(null);
  };

  const openScanner = async () => {
    setScanError(null);
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      // wait for videoRef to mount via the modal
      const waitForVideo = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
          startDetect();
        } else {
          requestAnimationFrame(waitForVideo);
        }
      };
      requestAnimationFrame(waitForVideo);
    } catch {
      setScanError('카메라 접근 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
    }
  };

  const startDetect = () => {
    if (!('BarcodeDetector' in window)) {
      setScanError('이 브라우저에서는 QR 스캔을 지원하지 않습니다. 코드를 직접 입력해 주세요.');
      stopStream();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const barcodes: any[] = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const raw: string = barcodes[0].rawValue ?? '';
          const code = raw.trim().toUpperCase();
          if (code) {
            setOrgCode(code);
            closeScanner();
            return;
          }
        }
      } catch {
        // detection frame error — continue
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="예: KNU001"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  required
                  disabled={submitting}
                  aria-label="연결할 기관 코드"
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  style={{ flexShrink: 0, padding: '0 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  onClick={() => void openScanner()}
                  disabled={submitting}
                  aria-label="QR 코드 스캔으로 입력"
                >
                  QR 스캔
                </button>
              </div>
              <span className={styles.inputHint}>
                기관에서 받은 QR 코드를 스캔하거나 코드를 직접 입력하세요.
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

      {/* QR 스캐너 모달 */}
      {showScanner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
            boxSizing: 'border-box',
          }}
        >
          <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}>
            기관 QR 코드를 카메라에 비춰주세요
          </p>
          {scanError ? (
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '20px 16px',
                maxWidth: 300,
                textAlign: 'center',
              }}
            >
              <p style={{ color: '#c0392b', fontSize: '0.88rem', margin: '0 0 12px', lineHeight: 1.5 }}>
                {scanError}
              </p>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                width: 260,
                height: 260,
                borderRadius: 16,
                overflow: 'hidden',
                border: '3px solid #3CAB7E',
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
              />
              {/* 스캔 가이드 오버레이 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '2px solid rgba(60,171,126,0.6)',
                  borderRadius: 14,
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={closeScanner}
            style={{
              marginTop: 20,
              background: '#fff',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: 10,
              padding: '10px 28px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      )}
    </div>
    </AppShell>
  );
}
