import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import styles from './AppLayout.module.css';
import { AppShell } from '../components/AppShell';
import { getUnreadNotificationCount } from '../api/notifications';
import { RecordDetailModal } from '../components/RecordDetailModal';

export function AppLayout() {
  const { user, selectedRecipientId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const isMountedRef = useRef(true);
  locationRef.current = location;
  const [unreadCount, setUnreadCount] = useState(0);
  const recordParam = new URLSearchParams(location.search).get('record');
  const recordId = recordParam ? Number(recordParam) : null;
  const showRecordModal = (location.pathname === '/home' || location.pathname === '/records')
    && selectedRecipientId !== null && recordId !== null && Number.isInteger(recordId) && recordId > 0;

  const closeRecordModal = (changed: boolean) => {
    const currentLocation = locationRef.current;
    const params = new URLSearchParams(currentLocation.search);
    if (!isMountedRef.current || Number(params.get('record')) !== recordId) return;
    params.delete('record');
    navigate({ pathname: currentLocation.pathname, search: params.toString() }, {
      replace: true,
      state: changed
        ? { ...(currentLocation.state ?? {}), recordChangedAt: Date.now() }
        : currentLocation.state,
    });
  };

  const markRecordChanged = () => {
    if (!isMountedRef.current) return;
    const currentLocation = locationRef.current;
    if (currentLocation.pathname !== '/home' && currentLocation.pathname !== '/records') return;
    navigate({ pathname: currentLocation.pathname, search: currentLocation.search }, {
      replace: true,
      state: { ...(currentLocation.state ?? {}), recordChangedAt: Date.now() },
    });
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

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
