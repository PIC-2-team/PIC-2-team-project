import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';
import { getTodayRecords } from '../api/records';
import type { CareRecipient } from '../types/careRecipient';
import type { DailyRecord } from '../types/record';
import { Skeleton } from '../components/Skeleton/Skeleton';
import styles from './HomePage.module.css';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ok'; recipients: CareRecipient[]; recipient: CareRecipient; todayRecords: DailyRecord[] };

export function HomePage() {
  const { user, setSelectedRecipient } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const requestRef = useRef(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    if (user?.role === 'INSTITUTION') {
      navigate('/agency', { replace: true });
      return;
    }
    const requests = requestRef;
    const requestId = ++requests.current;
    const load = async () => {
      try {
        const recipients = await listCareRecipients();
        if (requestId !== requestRef.current) return;
        const first = recipients[0] ?? null;
        if (!first) {
          setPage({ status: 'empty' });
          return;
        }
        setSelectedRecipient(first.id);
        const records = await getTodayRecords(first.id);
        if (requestId !== requestRef.current) return;
        setPage({ status: 'ok', recipients, recipient: first, todayRecords: records });
      } catch (e) {
        if (requestId !== requestRef.current) return;
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    };
    void load();
    return () => { requests.current++; };
  }, [user?.role, navigate, setSelectedRecipient]);

  if (page.status === 'loading') return (
    <div className="demo-page status-page" data-testid="loading-skeleton">
      <Skeleton height={80} count={2} />
    </div>
  );
  if (page.status === 'error') return <div className="demo-page status-page"><p className="error" role="alert">{page.message}</p></div>;
  if (page.status === 'empty') {
    const isSupportWorker = user?.role === 'SUPPORT_WORKER';
    return (
      <div className="demo-page status-page">
        <h1>안녕하세요, {user?.name}님!</h1>
        <div className="empty-state">
          {isSupportWorker ? (
            <p>아직 배정된 담당 이용자가 없어요.</p>
          ) : (
            <>
              <p>{user?.name}님, 당사자 정보를 먼저 등록해 주세요.</p>
              <button className="btn" type="button" onClick={() => navigate('/care-recipients/new')}>당사자 등록</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { recipients, recipient, todayRecords } = page;
  const canWrite = user?.role === 'GUARDIAN';

  const handleRecipientChange = async (id: number) => {
    const next = recipients.find(r => r.id === id);
    if (!next) return;
    const requestId = ++requestRef.current;
    setSelectedRecipient(id);
    setPage({ status: 'ok', recipients, recipient: next, todayRecords: [] });
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const records = await getTodayRecords(id);
      if (requestId !== requestRef.current) return;
      setPage({ status: 'ok', recipients, recipient: next, todayRecords: records });
    } catch {
      if (requestId !== requestRef.current) return;
      setRecordsError('기록을 불러오지 못했어요. 다시 당사자를 선택해 주세요.');
    } finally {
      if (requestId === requestRef.current) setRecordsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.profile}>
        <div className={styles.avatar} aria-hidden="true">
          {Array.from(user?.name ?? '?')[0]}
        </div>
        <div>
          <h1 className={styles.name}>안녕하세요, {user?.name}님!</h1>
          <p className={styles.greeting}>오늘도 좋은 하루 보내세요!</p>
        </div>
      </div>

      {recipients.length > 1 ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="muted">돌봄 당사자</span>
          <select
            aria-label="당사자 선택"
            value={recipient.id}
            onChange={e => void handleRecipientChange(Number(e.target.value))}
            style={{ border: '1px solid #d0d5dc', borderRadius: '6px', padding: '4px 8px', fontSize: '0.9rem' }}
          >
            {recipients.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">돌봄 당사자 · <span>{recipient.name}님</span></p>
      )}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>오늘의 기록</h2>
          <button
            className={styles.viewAll}
            onClick={() => navigate('/records')}
            type="button"
          >
            전체보기 ›
          </button>
        </div>

        <div className={styles.records}>
          {recordsLoading ? (
            <p role="status">기록을 불러오는 중…</p>
          ) : recordsError ? (
            <p role="alert" className="error">{recordsError}</p>
          ) : todayRecords.length === 0 ? (
            <p>오늘 기록이 없어요.</p>
          ) : (
            todayRecords.map(record => (
              <Link key={record.id} to={`/records/${record.id}`} className={styles.recordCard}>
                <p className={styles.recordContent}>{record.content}</p>
                <span className={styles.recordTime}>
                  {new Date(record.recordedAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {canWrite && (
        <button
          className={styles.recordButton}
          type="button"
          onClick={() => navigate('/records/new')}
        >
          기록하기
        </button>
      )}
    </div>
  );
}
