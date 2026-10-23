import styles from './AdminTabBar.module.css';

export type AdminTabId = 'dashboard' | 'organizations' | 'users' | 'more';

interface AdminTabBarProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  orgCount?: number;
  userCount?: number;
}

export function AdminTabBar({
  activeTab,
  onTabChange,
  orgCount,
  userCount,
}: AdminTabBarProps) {
  const tabs: {
    id: AdminTabId;
    label: string;
    icon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3v18h18"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="7"
            y="11"
            width="3"
            height="7"
            rx="1"
            fill={active ? '#3CAB7E' : '#6b7e95'}
          />
          <rect
            x="12"
            y="7"
            width="3"
            height="11"
            rx="1"
            fill={active ? '#3CAB7E' : '#6b7e95'}
          />
          <rect
            x="17"
            y="13"
            width="3"
            height="5"
            rx="1"
            fill={active ? '#3CAB7E' : '#6b7e95'}
          />
        </svg>
      ),
    },
    {
      id: 'organizations',
      label: `기관 관리${orgCount !== undefined ? ` (${orgCount})` : ''}`,
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 21h18"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5 21V7l8-4v18"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13 10l6 3v8"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="9"
            y1="9"
            x2="9"
            y2="9.01"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="13"
            x2="9"
            y2="13.01"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="17"
            x2="9"
            y2="17.01"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: 'users',
      label: `사용자 목록${userCount !== undefined ? ` (${userCount})` : ''}`,
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="9"
            cy="7"
            r="4"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
          />
          <path
            d="M23 21v-2a4 4 0 00-3-3.87"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 3.13a4 4 0 010 7.75"
            stroke={active ? '#3CAB7E' : '#6b7e95'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'more',
      label: '더보기',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" fill={active ? '#3CAB7E' : '#6b7e95'} />
          <circle cx="12" cy="12" r="1.8" fill={active ? '#3CAB7E' : '#6b7e95'} />
          <circle cx="19" cy="12" r="1.8" fill={active ? '#3CAB7E' : '#6b7e95'} />
        </svg>
      ),
    },
  ];

  return (
    <nav className={styles.tabBar} aria-label="관리자 메뉴">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon(isActive)}
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
