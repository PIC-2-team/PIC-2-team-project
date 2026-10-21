import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './MorePage.module.css';

const ROLE_LABEL: Record<string, string> = {
  GUARDIAN: '돌봄 보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관 담당자',
};

type MenuItem = {
  label: string;
  value?: string;
  to?: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const BASE_MENU_SECTIONS: MenuSection[] = [
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

  const sections: MenuSection[] = [];

  if (user?.role === 'GUARDIAN') {
    sections.push({
      title: '돌봄 관리',
      items: [
        { label: '세컨드 보호자 관리', to: '/secondary-guardian' },
        { label: '돌봄 관계 관리', to: '/care-relations' },
      ],
    });
  }

  sections.push(...BASE_MENU_SECTIONS);

  return (
    <div className="demo-page">
      <h1>더보기</h1>

      <div className="demo-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className={styles.avatar}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <circle cx="18" cy="14" r="7" fill="#b8c4ce" />
            <path d="M4 32c0-7.7 6.3-14 14-14s14 6.3 14 14" fill="#b8c4ce" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: '1rem' }}>{user?.name ?? '—'}님</p>
          <p className="muted" style={{ margin: 0 }}>{user ? (ROLE_LABEL[user.role] ?? user.role) : ''}</p>
          {user?.email && <p className="muted" style={{ margin: 0, overflowWrap: 'anywhere' }}>{user.email}</p>}
        </div>
      </div>

      {sections.map(section => (
        <div key={section.title}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>{section.title}</p>
          <div className="demo-card" style={{ padding: 0, gap: 0 }}>
            {section.items.map(item => (
              <button
                key={item.label}
                type="button"
                className="menu-link"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: '16px 20px' }}
                onClick={() => {
                  if (item.to) navigate(item.to);
                }}
              >
                <span>{item.label}</span>
                {item.value
                  ? <span className="muted">{item.value}</span>
                  : <span style={{ color: 'var(--green)' }} aria-hidden="true">›</span>
                }
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn secondary"
        style={{ color: '#e05555', borderColor: '#f5c6c4' }}
        onClick={handleLogout}
      >
        로그아웃
      </button>
    </div>
  );
}
