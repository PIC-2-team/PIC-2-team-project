import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

const TABS = [
  {
    to: '/home',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke={active ? '#3CAB7E' : '#8a9ab0'}
          strokeWidth="1.8"
          fill={active ? '#3CAB7E' : 'none'}
          fillOpacity={active ? 0.15 : 0}
        />
        <rect x="9" y="13" width="6" height="8" rx="1" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    to: '/records',
    label: '생활기록',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
        <line x1="8" y1="2" x2="8" y2="6" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="2" x2="16" y2="6" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="3" y1="9" x2="21" y2="9" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    to: '/care-info',
    label: '돌봄정보',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19.5A2.5 2.5 0 016.5 17H20"
          stroke={active ? '#3CAB7E' : '#8a9ab0'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
          stroke={active ? '#3CAB7E' : '#8a9ab0'}
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    to: '/more',
    label: '더보기',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
        <circle cx="12" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
        <circle cx="19" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
      </svg>
    ),
  },
];

export default function TabBar() {
  return (
    <nav className={styles.tabBar} aria-label="주요 메뉴">
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          {({ isActive }) => (
            <>
              {tab.icon(isActive)}
              <span className={styles.label}>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
