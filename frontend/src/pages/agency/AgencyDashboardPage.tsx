import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';
import { getMyOrganization, getMembers, getAssignments } from '../../api/organizations';
import type { Organization, OrganizationMember, CareAssignment } from '../../types/agency';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; org: Organization; members: OrganizationMember[]; assignments: CareAssignment[] };

export function AgencyDashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    const load = async () => {
      try {
        const [org, members, assignments] = await Promise.all([
          getMyOrganization(),
          getMembers(),
          getAssignments(),
        ]);
        setPage({ status: 'ok', org, members, assignments });
      } catch (e) {
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    };
    void load();
  }, []);

  return (
    <AppShell role={user?.role} footer={<TabBar />}>
      <main className="demo-page">
        <div>
          <p className="muted">{user?.name} 담당자님</p>
          <h1>기관 대시보드</h1>
        </div>

        {page.status === 'loading' && <p className="empty-state" role="status">불러오는 중…</p>}
        {page.status === 'error' && <p className="error" role="alert">{page.message}</p>}

        {page.status === 'ok' && (
          <>
            <section className="demo-card">
              <h2>{page.org.name}</h2>
              <p className="muted">기관 코드: {page.org.organizationCode}</p>
            </section>

            <section className="demo-card">
              <h2>활동지원사 ({page.members.length}명)</h2>
              {page.members.length === 0 ? (
                <p className="empty-state">소속 활동지원사가 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.members.map(m => (
                    <li key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <span>{m.name}</span>
                      <span className="muted" style={{ marginLeft: 8 }}>
                        {m.status === 'ACTIVE' ? '활성' : '비활성'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="demo-card">
              <h2>배정 현황 ({page.assignments.filter(a => !a.endedAt).length}건 진행 중)</h2>
              {page.assignments.length === 0 ? (
                <p className="empty-state">배정 내역이 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.assignments.filter(a => !a.endedAt).map(a => (
                    <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <span className="muted" style={{ fontSize: '0.85em' }}>
                        이용자 #{a.careRecipientId} · 지원사 #{a.supportWorkerId}
                      </span>
                      <span className="muted" style={{ display: 'block', fontSize: '0.8em' }}>
                        {new Date(a.startDate).toLocaleDateString('ko-KR')} ~{' '}
                        {a.endDate ? new Date(a.endDate).toLocaleDateString('ko-KR') : '진행 중'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
