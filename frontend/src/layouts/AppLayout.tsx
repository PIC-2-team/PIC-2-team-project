import { useAuth } from '../contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import styles from './AppLayout.module.css';
import { AppShell } from '../components/AppShell';

export function AppLayout() {
  const { user } = useAuth();
  return (
    <AppShell role={user?.role} footer={<TabBar />}>
      <main className={styles.main}>
        <Outlet context={{ hasAppShell: true }} />
      </main>
    </AppShell>
  );
}
