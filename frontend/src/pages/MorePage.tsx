import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './MorePage.module.css';

const ROLE_LABEL: Record<string, string> = {
  GUARDIAN: '돌봄 보호자',
  CAREGIVER: '활동지원사',
  AGENCY: '기관 담당자',
};

const MENU_SECTIONS = [
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

export function MorePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (!window.confirm('로그아웃할까요?')) return;
    logout();
    navigate('/login', { replace: true });
  };

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
          <p className={styles.name}>{user?.name ?? '—'}님</p>
          <p className={styles.role}>{user ? (ROLE_LABEL[user.role] ?? user.role) : ''}</p>
          {user?.email && <p className={styles.email}>{user.email}</p>}
        </div>
        {/* TODO: PATCH /api/users/me 필드 미정 — 확정 후 활성화 */}
        <button type="button" className={styles.editButton} aria-label="프로필 편집 (준비 중)" disabled>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z" stroke="#b8c4ce" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

      <button
        type="button"
        className={styles.logoutButton}
        onClick={handleLogout}
      >
        로그아웃
      </button>
    </div>
  );
}
