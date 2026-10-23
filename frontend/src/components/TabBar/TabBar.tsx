import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/user';
import styles from './TabBar.module.css';

type Tab = { to: string; label: string; icon: (active: boolean) => React.ReactNode };

const HOME_TAB: Tab = {
  to: '/home',
  label: '홈',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" fill={active ? '#3CAB7E' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="9" y="13" width="6" height="8" rx="1" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
    </svg>
  ),
};

const AGENCY_HOME_TAB: Tab = {
  to: '/agency',
  label: '홈',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" fill={active ? '#3CAB7E' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="9" y="13" width="6" height="8" rx="1" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
    </svg>
  ),
};

const WORKERS_TAB: Tab = {
  to: '/agency?tab=workers',
  label: '돌봄지원사 관리',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 010 7.75" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

const RECORDS_TAB: Tab = {
  to: '/records',
  label: '생활기록',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
    </svg>
  ),
};

const CARE_TAB: Tab = {
  to: '/care-info',
  label: '돌봄정보',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={active ? '#3CAB7E' : '#6b7e95'} strokeWidth="1.8" />
    </svg>
  ),
};

const MORE_TAB: Tab = {
  to: '/more',
  label: '더보기',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#6b7e95'} />
      <circle cx="12" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#6b7e95'} />
      <circle cx="19" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#6b7e95'} />
    </svg>
  ),
};

export default function TabBar({ role, unreadCount }: { role?: UserRole; unreadCount?: number } = {}) {
  const { user } = useAuth();
  const effectiveRole = role ?? user?.role;
  const isInstitution = effectiveRole === 'INSTITUTION';
  const tabs = isInstitution
    ? [AGENCY_HOME_TAB, WORKERS_TAB, MORE_TAB]
    : [HOME_TAB, RECORDS_TAB, CARE_TAB, MORE_TAB];

  return (
    <nav className={styles.tabBar} aria-label="주요 메뉴">
      {tabs.map(tab => {
        const showBadge = tab === MORE_TAB && (unreadCount ?? 0) > 0;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            {({ isActive }) => (
              <>
                <span className={styles.iconWrap}>
                  {tab.icon(isActive)}
                  {showBadge && (
                    <span
                      className={styles.badge}
                      aria-label={`안 읽은 알림 ${unreadCount! > 99 ? '99+' : unreadCount}개`}
                    >
                      {unreadCount! > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span className={styles.label}>{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
