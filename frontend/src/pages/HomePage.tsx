import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';
import { getTodayRecords } from '../api/records';
import type { CareRecipient } from '../types/careRecipient';
import type { DailyRecord } from '../types/record';
import styles from './HomePage.module.css';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ok'; recipient: CareRecipient; todayRecords: DailyRecord[] };

export function HomePage() {
  const { user, setSelectedRecipient } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (user?.role === 'AGENCY') {
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
        setPage({ status: 'ok', recipient: first, todayRecords: records });
      } catch (e) {
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    };
    void load();
  }, [user?.role, navigate, setSelectedRecipient]);

  if (page.status === 'loading') return <div className="demo-page status-page"><p className="empty-state" role="status">불러오는 중…</p></div>;
  if (page.status === 'error') return <div className="demo-page status-page"><p className="error" role="alert">{page.message}</p></div>;
  if (page.status === 'empty') {
    return (
      <div className="demo-page status-page">
        <h1>안녕하세요, {user?.name}님!</h1>
        <div className="empty-state">
          <p>{user?.name}님, 당사자 정보를 먼저 등록해 주세요.</p>
          <button className="btn" type="button" onClick={() => navigate('/care-recipients/new')}>당사자 등록</button>
        </div>
      </div>
    );
  }

  const { recipient, todayRecords } = page;
  const canWrite = user?.role === 'GUARDIAN';

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

      <p className="muted">돌봄 당사자 · <span>{recipient.name}님</span></p>
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
