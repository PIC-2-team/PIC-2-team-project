import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './TabBar.module.css';

type Tab = { to: string; label: string; icon: (active: boolean) => React.ReactNode };

const HOME_TAB: Tab = {
  to: '/home',
  label: '홈',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" fill={active ? '#3CAB7E' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="9" y="13" width="6" height="8" rx="1" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
    </svg>
  ),
};

const AGENCY_HOME_TAB: Tab = {
  to: '/agency',
  label: '홈',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" fill={active ? '#3CAB7E' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="9" y="13" width="6" height="8" rx="1" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
    </svg>
  ),
};

const WORKERS_TAB: Tab = {
  to: '/agency?tab=workers',
  label: '돌봄 지원사 관리',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 010 7.75" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

const ASSIGNMENTS_TAB: Tab = {
  to: '/agency?tab=assignments',
  label: '배정',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
      <path d="M9 12l2 2 4-4" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const RECORDS_TAB: Tab = {
  to: '/records',
  label: '생활기록',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="9" x2="21" y2="9" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
    </svg>
  ),
};

const CARE_TAB: Tab = {
  to: '/care-info',
  label: '돌봄정보',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={active ? '#3CAB7E' : '#8a9ab0'} strokeWidth="1.8" />
    </svg>
  ),
};

const MORE_TAB: Tab = {
  to: '/more',
  label: '더보기',
  icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
      <circle cx="12" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
      <circle cx="19" cy="12" r="1.5" fill={active ? '#3CAB7E' : '#8a9ab0'} />
    </svg>
  ),
};

import type { UserRole } from '../../types/user';

export default function TabBar({ role }: { role?: UserRole } = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const effectiveRole = role ?? user?.role;
  const isInstitution = effectiveRole === 'INSTITUTION';
  const tabs = isInstitution
    ? [AGENCY_HOME_TAB, WORKERS_TAB, ASSIGNMENTS_TAB, MORE_TAB]
    : [HOME_TAB, RECORDS_TAB, CARE_TAB, MORE_TAB];

  const currentTab = new URLSearchParams(location.search).get('tab') || 'home';

  const checkIsActive = (to: string) => {
    if (isInstitution && location.pathname === '/agency') {
      if (to === '/agency') return currentTab === 'home';
      if (to.includes('tab=workers')) return currentTab === 'workers';
      if (to.includes('tab=assignments')) return currentTab === 'assignments';
      return false;
    }
    return location.pathname === to;
  };

  return (
    <nav className={styles.tabBar} aria-label="주요 메뉴">
      {tabs.map(tab => {
        const active = checkIsActive(tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`${styles.tab} ${active ? styles.active : ''}`}
          >
            {tab.icon(active)}
            <span className={styles.label}>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
