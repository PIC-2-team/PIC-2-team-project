import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { verifyWorkerOrganization } from '../api/organizations';
import type { Organization } from '../types/agency';
import styles from './CareRelationsPage.module.css';

export function WorkerOrganizationPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  const stopScanning = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const scan = async () => {
    setError(null);
    if (!('BarcodeDetector' in window)) {
      setError('이 브라우저에서는 QR 스캔을 지원하지 않습니다. 기관 코드를 직접 입력해 주세요.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setScanning(true);
    } catch {
      setError('카메라 접근 권한이 필요합니다. 기관 코드를 직접 입력할 수도 있습니다.');
    }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play();
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    let active = true;
    let frame = 0;
    const tick = async () => {
      if (!active) return;
      try {
        if (video.readyState >= 2) {
          const results = await detector.detect(video);
          const scanned = results[0]?.rawValue?.trim().toUpperCase();
          if (scanned) {
            setCode(scanned);
            setOrganization(null);
            stopScanning();
            return;
          }
        }
      } catch {
        setError('QR 코드를 읽지 못했습니다. 다시 시도하거나 코드를 직접 입력해 주세요.');
        stopScanning();
        return;
      }
      if (active) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [scanning]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    setOrganization(null);
    try {
      setOrganization(await verifyWorkerOrganization(code.trim().toUpperCase()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '기관을 확인하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell role="SUPPORT_WORKER">
      <main className={styles.container}>
        <header className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>‹ 뒤로</button>
          <h1 className={styles.title}>기관 연결 확인</h1>
        </header>
        <p className={styles.infoBanner}>
          기관에서 받은 QR 코드를 스캔하거나 기관 코드를 직접 입력하세요.<br />
          기관 담당자가 활동지원사로 등록한 계정만 확인할 수 있습니다.
        </p>
        {!organization && (
          <form className={styles.linkForm} onSubmit={verify}>
            <label className={styles.formLabel} htmlFor="worker-org-code">기관 코드</label>
            <input id="worker-org-code" className={styles.input} value={code} onChange={event => { setCode(event.target.value.toUpperCase()); }} placeholder="예: KNU001" required />
            <button type="button" className={styles.btnPrimary} onClick={() => void scan()}>📷 QR 코드 스캔</button>
            <button type="submit" className={styles.btnPrimary} disabled={!code.trim() || busy}>{busy ? '확인 중…' : '기관 연결 확인'}</button>
          </form>
        )}
        {error && <p role="alert" className={styles.alertError}>{error}</p>}
        {organization && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              role="status"
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 14,
                padding: '20px 18px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }} aria-hidden="true">✅</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#166534', margin: '0 0 4px' }}>기관 연결 확인 완료</p>
              <p style={{ fontSize: 14, color: '#166534', margin: 0 }}>
                <strong>{organization.name}</strong>에 소속 활동지원사로 등록되어 있습니다.
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>기관 코드: {organization.organizationCode}</p>
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => navigate('/home')}
            >
              홈으로 돌아가기
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ background: '#f0f7f3', color: '#2e7d5a' }}
              onClick={() => { setOrganization(null); setCode(''); setError(null); }}
            >
              다른 코드 확인하기
            </button>
          </div>
        )}
        {scanning && (
          <div role="dialog" aria-label="기관 QR 코드 스캔" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 }}>
            <p style={{ color: '#fff' }}>기관 QR 코드를 카메라에 비춰주세요</p>
            <video ref={videoRef} playsInline style={{ width: 'min(100%, 300px)', border: '3px solid #3CAB7E', borderRadius: 12 }} />
            <button type="button" className={styles.btnPrimary} onClick={stopScanning}>닫기</button>
          </div>
        )}
      </main>
    </AppShell>
  );
}
