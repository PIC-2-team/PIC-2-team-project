import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';

export function AgencyDashboardPage() {
  const { user } = useAuth();
  return (
    <AppShell role={user?.role} footer={<TabBar />}>
      <main className="demo-page">
        <div><p className="muted">{user?.name} 담당자님</p><h1>기관 대시보드</h1></div>
        <section className="demo-card">
          <h2>활동지원사 관리</h2>
          <div className="empty-state">준비 중입니다</div>
        </section>
        <section className="demo-card">
          <h2>배정 관리</h2>
          <div className="empty-state">준비 중입니다</div>
        </section>
      </main>
    </AppShell>
  );
}
