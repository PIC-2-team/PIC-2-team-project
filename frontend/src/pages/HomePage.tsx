import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

const MOCK_USER = { name: '김OO' };

const MOCK_RECORDS = [
  {
    id: 1,
    content: '조용한 공간에서 안정된 모습을 보였어요.',
    time: '오전 10:30',
    category: 'EMOTION' as const,
  },
  {
    id: 2,
    content: '외출 전에 미리 알려주니 잘 따라왔어요.',
    time: '오후 02:15',
    category: 'SCHEDULE' as const,
  },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  EMOTION: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 2C6.03 2 2 6.03 2 11s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" fill="#e8f5ee" />
      <path d="M11 4a4 4 0 00-2.8 6.8L11 14l2.8-3.2A4 4 0 0011 4z" fill="#3CAB7E" />
    </svg>
  ),
  SCHEDULE: (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="20" height="18" rx="3" fill="#e8f0fb" />
      <rect x="1" y="3" width="20" height="6" rx="3" fill="#5b8dee" />
      <line x1="7" y1="1" x2="7" y2="5" stroke="#5b8dee" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="1" x2="15" y2="5" stroke="#5b8dee" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="14" r="1.5" fill="#5b8dee" />
      <circle cx="11" cy="14" r="1.5" fill="#5b8dee" />
    </svg>
  ),
};

const CATEGORY_BG: Record<string, string> = {
  EMOTION: '#e8f5ee',
  SCHEDULE: '#e8f0fb',
};

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.profile}>
        <div className={styles.avatar} aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="14" r="7" fill="#c8d0d8" />
            <path d="M4 34c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#c8d0d8" />
          </svg>
        </div>
        <div>
          <p className={styles.name}>{MOCK_USER.name}님</p>
          <p className={styles.greeting}>오늘도 좋은 하루 보내세요!</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>오늘의 생활기록</h2>
          <button
            className={styles.viewAll}
            onClick={() => navigate('/records')}
            type="button"
          >
            전체보기 ›
          </button>
        </div>

        <div className={styles.records}>
          {MOCK_RECORDS.map(record => (
            <div key={record.id} className={styles.recordCard}>
              <div
                className={styles.recordIcon}
                style={{ background: CATEGORY_BG[record.category] }}
              >
                {CATEGORY_ICON[record.category]}
              </div>
              <p className={styles.recordContent}>{record.content}</p>
              <span className={styles.recordTime}>{record.time}</span>
            </div>
          ))}
        </div>
      </section>

      <button
        className={styles.recordButton}
        type="button"
        onClick={() => navigate('/records/new')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M14 2.5l3.5 3.5L6 17.5H2.5V14L14 2.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        기록하기
      </button>
    </div>
  );
}
