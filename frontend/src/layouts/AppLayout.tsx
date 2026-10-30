import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import styles from './AppLayout.module.css';
import { AppShell } from '../components/AppShell';
import { getUnreadNotificationCount } from '../api/notifications';
import { RecordDetailModal } from '../components/RecordDetailModal';

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const recordParam = new URLSearchParams(location.search).get('record');
  const recordId = recordParam ? Number(recordParam) : null;
  const showRecordModal = (location.pathname === '/home' || location.pathname === '/records')
    && recordId !== null && Number.isInteger(recordId) && recordId > 0;

  const closeRecordModal = (changed: boolean) => {
    const params = new URLSearchParams(location.search);
    params.delete('record');
    navigate({ pathname: location.pathname, search: params.toString() }, {
      replace: true,
      state: changed && !(location.state as { recordChangedAt?: number } | null)?.recordChangedAt
        ? { recordChangedAt: Date.now() }
        : location.state,
    });
  };

  const markRecordChanged = () => {
    navigate({ pathname: location.pathname, search: location.search }, {
      replace: true,
      state: { recordChangedAt: Date.now() },
    });
  };

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
      {showRecordModal && <RecordDetailModal key={recordId} recordId={recordId} onClose={closeRecordModal} onChanged={markRecordChanged} />}
    </AppShell>
  );
}
