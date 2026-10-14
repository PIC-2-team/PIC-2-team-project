import { Outlet } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
