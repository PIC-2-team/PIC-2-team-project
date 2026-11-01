import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [recordVersion, setRecordVersion] = useState(0);
  const [recordActionError, setRecordActionError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const recordParam = new URLSearchParams(location.search).get('record');
  const recordId = recordParam ? Number(recordParam) : null;
  const showRecordModal = (location.pathname === '/home' || location.pathname === '/records')
    && selectedRecipientId !== null && recordId !== null && Number.isInteger(recordId) && recordId > 0;

  const closeRecordModal = () => {
    const currentLocation = locationRef.current;
    const params = new URLSearchParams(currentLocation.search);
    if (!isMountedRef.current || Number(params.get('record')) !== recordId) return;
    if ((currentLocation.state as { recordModalFromList?: boolean } | null)?.recordModalFromList) {
      navigate(-1);
      return;
    }
    params.delete('record');
    navigate({ pathname: currentLocation.pathname, search: params.toString() }, {
      replace: true,
      state: currentLocation.state,
    });
  };

  const markRecordChanged = () => {
    if (!isMountedRef.current) return;
    setRecordVersion(version => version + 1);
    setRecordActionError(null);
  };

  const reportRecordError = (message: string) => {
    if (isMountedRef.current) setRecordActionError(message);
  };

  useLayoutEffect(() => { locationRef.current = location; }, [location]);

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
      {recordActionError && (
        <div className={styles.recordError} role="alert">
          <span>{recordActionError}</span>
          <button type="button" onClick={() => setRecordActionError(null)} aria-label="기록 오류 알림 닫기">✕</button>
        </div>
      )}
      <main className={styles.main}>
        <Outlet context={{ hasAppShell: true, recordVersion }} />
      </main>
      {showRecordModal && <RecordDetailModal key={`${selectedRecipientId}:${recordId}`} recordId={recordId} onClose={closeRecordModal} onChanged={markRecordChanged} onError={reportRecordError} />}
    </AppShell>
  );
}
