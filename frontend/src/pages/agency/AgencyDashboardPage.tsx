import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';
import { getMyOrganization, getMembers, getAssignments, registerOrganization } from '../../api/organizations';
import { ApiError } from '../../api/client';
import type { Organization, OrganizationMember, CareAssignment } from '../../types/agency';

type PageState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'ok'; org: Organization; members: OrganizationMember[]; assignments: CareAssignment[] };

export function AgencyDashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const [orgCode, setOrgCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [org, members, assignments] = await Promise.all([
        getMyOrganization(),
        getMembers(),
        getAssignments(),
      ]);
      setPage({ status: 'ok', org, members, assignments });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.code === 'ORGANIZATION_NOT_FOUND')) {
        setPage({ status: 'not_found' });
      } else {
        setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
      }
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [org, members, assignments] = await Promise.all([
          getMyOrganization(),
          getMembers(),
          getAssignments(),
        ]);
        if (active) setPage({ status: 'ok', org, members, assignments });
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 404 || e.code === 'ORGANIZATION_NOT_FOUND')) {
          setPage({ status: 'not_found' });
        } else {
          setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
        }
      }
    })();
    return () => { active = false; };
  }, []);

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = orgCode.trim().toUpperCase();
    if (!code || isSubmitting) return;
    setIsSubmitting(true);
    setRegisterError(null);
    try {
      await registerOrganization({ organizationCode: code });
      await fetchDashboardData();
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : '기관 등록에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell role={user?.role} footer={<TabBar />}>
      <main className="demo-page">
        <div>
          <p className="muted">{user?.name} 담당자님</p>
          <h1>기관 대시보드</h1>
        </div>

        {page.status === 'loading' && <p className="empty-state" role="status">불러오는 중…</p>}
        {page.status === 'error' && <p className="error" role="alert">{page.message}</p>}

        {page.status === 'not_found' && (
          <section className="demo-card">
            <h2>소속 기관을 등록해 주세요</h2>
            <p className="muted">기관 대시보드를 이용하려면 슈퍼 어드민에서 발급받은 6자리 기관 코드를 등록해야 합니다.</p>
            <form className="demo-form" onSubmit={(e) => { void handleRegisterOrg(e); }}>
              <label>
                기관 코드 (6자리)
                <input
                  type="text"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  placeholder="예: KNU001"
                  required
                  maxLength={6}
                />
              </label>
              {registerError && <p className="error" role="alert">{registerError}</p>}
              <button className="btn" type="submit" disabled={!orgCode.trim() || isSubmitting}>
                {isSubmitting ? '등록 중…' : '기관 등록'}
              </button>
            </form>
          </section>
        )}

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
