import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import styles from './AppLayout.module.css';
import { AppShell } from '../components/AppShell';
import { getUnreadNotificationCount } from '../api/notifications';

export function AppLayout() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.role) return;
    let mounted = true;
    getUnreadNotificationCount()
      .then(n => { if (mounted) setUnreadCount(n); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [user?.role]);

  return (
    <AppShell role={user?.role} footer={<TabBar unreadCount={unreadCount} />}>
      <main className={styles.main}>
        <Outlet context={{ hasAppShell: true }} />
      </main>
    </AppShell>
  );
}
