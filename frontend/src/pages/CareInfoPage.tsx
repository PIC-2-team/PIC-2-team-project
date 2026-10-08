import styles from './CareInfoPage.module.css';

const CATEGORIES = [
  {
    id: 'COMMUNICATION',
    label: '의사소통',
    bg: '#e8f5ee',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="13" cy="15" r="8" fill="#3CAB7E" />
        <circle cx="23" cy="19" r="8" fill="#2d9468" />
        <circle cx="10" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="16" cy="13" r="3" fill="white" opacity="0.6" />
        <circle cx="20" cy="17" r="3" fill="white" opacity="0.6" />
        <circle cx="26" cy="17" r="3" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'PREFERENCE',
    label: '선호/비선호',
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M18 29s-13-8.5-13-16a8 8 0 0116 0 8 8 0 0116 0c0 7.5-13 16-19 16z"
          fill="#e05555"
        />
      </svg>
    ),
  },
  {
    id: 'LIFESTYLE',
    label: '생활습관',
    bg: '#fff3e8',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 16L18 6l12 10v14H6V16z" fill="#f57c00" />
        <rect x="14" y="22" width="8" height="8" rx="1" fill="white" opacity="0.8" />
        <rect x="16" y="19" width="4" height="4" rx="0.5" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'HEALTH_MEDICATION',
    label: '건강·복약',
    bg: '#e8f0fb',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect
          x="8" y="14" width="20" height="9" rx="4.5"
          fill="#5b8dee"
          transform="rotate(-45 18 18)"
        />
        <line
          x1="11" y1="25" x2="25" y2="11"
          stroke="white" strokeWidth="2" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'PRECAUTION',
    label: '주의사항',
    bg: '#fff8e1',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 5L33 30H3L18 5z" fill="#f9a825" />
        <rect x="16.5" y="14" width="3" height="8" rx="1.5" fill="white" />
        <circle cx="18" cy="25" r="1.8" fill="white" />
      </svg>
    ),
  },
  {
    id: 'EMERGENCY',
    label: '위기대응',
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="10" y="18" width="16" height="10" rx="2" fill="#e05555" />
        <path d="M13 18V14a5 5 0 0110 0v4" stroke="#e05555" strokeWidth="2.5" fill="none" />
        <ellipse cx="18" cy="13" rx="7" ry="5" fill="#e05555" opacity="0.25" />
        <circle cx="18" cy="22" r="2.5" fill="white" />
        <line x1="8" y1="14" x2="5" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="14" x2="31" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="10" x2="18" y2="7" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function CareInfoPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>돌봄정보</h1>

      <div className={styles.grid} role="list">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={styles.card}
            type="button"
            role="listitem"
            aria-label={cat.label}
          >
            <div className={styles.iconWrap} style={{ background: cat.bg }}>
              {cat.icon}
            </div>
            <div className={styles.cardBottom}>
              <span className={styles.cardLabel}>{cat.label}</span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
