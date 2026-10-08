import styles from './MorePage.module.css';

const MOCK_USER = { name: '김OO', role: '돌봄 제공자' };

const MENU_SECTIONS = [
  {
    title: '내 정보',
    items: [
      { label: '개인정보 설정' },
      { label: '알림 설정' },
    ],
  },
  {
    title: '서비스',
    items: [
      { label: '서비스 이용약관' },
      { label: '개인정보처리방침' },
      { label: '오픈소스 라이선스' },
    ],
  },
  {
    title: '지원',
    items: [
      { label: '문의하기' },
      { label: '앱 버전', value: '1.0.0' },
    ],
  },
];

export default function MorePage() {
  return (
    <div className={styles.page}>
      <div className={styles.profile}>
        <div className={styles.avatar}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <circle cx="18" cy="14" r="7" fill="#b8c4ce" />
            <path d="M4 32c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#b8c4ce" />
          </svg>
        </div>
        <div className={styles.profileInfo}>
          <p className={styles.name}>{MOCK_USER.name}님</p>
          <p className={styles.role}>{MOCK_USER.role}</p>
        </div>
        <button type="button" className={styles.editButton} aria-label="프로필 편집">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className={styles.sections}>
        {MENU_SECTIONS.map(section => (
          <div key={section.title} className={styles.section}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <div className={styles.card}>
              {section.items.map((item, idx) => (
                <button
                  key={item.label}
                  type="button"
                  className={`${styles.menuItem} ${idx < section.items.length - 1 ? styles.menuItemBorder : ''}`}
                >
                  <span className={styles.menuLabel}>{item.label}</span>
                  {item.value
                    ? <span className={styles.menuValue}>{item.value}</span>
                    : <span className={styles.chevron} aria-hidden="true">›</span>
                  }
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.logoutButton}>로그아웃</button>
    </div>
  );
}
