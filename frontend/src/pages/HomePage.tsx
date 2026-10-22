import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    if (user?.role === 'INSTITUTION') {
      navigate('/agency', { replace: true });
      return;
    }
    const load = async () => {
      try {
        const recipients = await listCareRecipients();
        const first = recipients[0] ?? null;
        if (!first) {
          setPage({ status: 'empty' });
          return;
        }
        setSelectedRecipient(first.id);
        const records = await getTodayRecords(first.id);
        setPage({ status: 'ok', recipients, recipient: first, todayRecords: records });
      } catch (e) {
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    };
    void load();
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
    setSelectedRecipient(id);
    try {
      const records = await getTodayRecords(id);
      setPage({ status: 'ok', recipients, recipient: next, todayRecords: records });
    } catch {
      setPage({ status: 'ok', recipients, recipient: next, todayRecords: [] });
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
          {todayRecords.length === 0 ? (
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
