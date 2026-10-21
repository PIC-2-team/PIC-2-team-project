import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';
import { getMyOrganization, getMembers, getAssignments, registerOrganization, assignSupportWorker, endAssignment } from '../../api/organizations';
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

  // 배정 모달 상태
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCareRecipientId, setAssignCareRecipientId] = useState('');
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

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

  const handleOpenAssignModal = () => {
    setAssignCareRecipientId('');
    if (page.status === 'ok' && page.members.length > 0) {
      setAssignWorkerId(String(page.members[0].userId ?? page.members[0].id));
    } else {
      setAssignWorkerId('');
    }
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignEndDate('');
    setAssignError(null);
    setShowAssignModal(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipientIdNum = Number(assignCareRecipientId.trim());
    const workerIdNum = Number(assignWorkerId.trim());

    if (!recipientIdNum || !workerIdNum || !assignStartDate) {
      setAssignError('대상자와 활동지원사, 시작일을 올바르게 입력해 주세요.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await assignSupportWorker({
        careRecipientId: recipientIdNum,
        supportWorkerId: workerIdNum,
        startDate: assignStartDate,
        endDate: assignEndDate.trim() ? assignEndDate.trim() : null,
      });
      setShowAssignModal(false);
      await fetchDashboardData();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : '배정에 실패했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEndAssignment = async (assignmentId: number) => {
    if (!window.confirm('해당 활동지원사 배정을 종료하시겠습니까?')) {
      return;
    }
    try {
      await endAssignment(assignmentId);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '배정 종료에 실패했습니다.');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>배정 현황 ({page.assignments.filter(a => !a.endedAt).length}건 진행 중)</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '6px 12px' }}
                  onClick={handleOpenAssignModal}
                >
                  배정하기
                </button>
              </div>

              {page.assignments.length === 0 ? (
                <p className="empty-state">배정 내역이 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.assignments.map(a => {
                    const isEnded = Boolean(a.endedAt);
                    const worker = page.members.find(m => m.userId === a.supportWorkerId || m.id === a.supportWorkerId);
                    const workerLabel = worker ? `${worker.name} (#${a.supportWorkerId})` : `#${a.supportWorkerId}`;

                    return (
                      <li
                        key={a.id}
                        style={{
                          padding: '12px 0',
                          borderBottom: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>
                              이용자 #{a.careRecipientId} · 지원사 {workerLabel}
                            </span>
                            {isEnded ? (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: '#f0f0f0',
                                color: '#666',
                              }}>
                                종료됨
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                borderRadius: 4,
                                backgroundColor: '#E8F5E9',
                                color: '#2E7D32',
                                fontWeight: 600,
                              }}>
                                진행 중
                              </span>
                            )}
                          </div>
                          <span className="muted" style={{ display: 'block', fontSize: '0.82rem' }}>
                            {new Date(a.startDate).toLocaleDateString('ko-KR')} ~{' '}
                            {a.endDate ? new Date(a.endDate).toLocaleDateString('ko-KR') : (isEnded ? '종료됨' : '진행 중')}
                          </span>
                        </div>

                        {!isEnded && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '4px 10px', color: '#c62828', borderColor: '#ef9a9a' }}
                            onClick={() => { void handleEndAssignment(a.id); }}
                          >
                            배정 종료
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {showAssignModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: 16,
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 420,
                    width: '100%',
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>활동지원사 배정</h2>
                  <form className="demo-form" onSubmit={(e) => { void handleCreateAssignment(e); }}>
                    <label>
                      돌봄 대상자 번호
                      <input
                        type="number"
                        value={assignCareRecipientId}
                        onChange={(e) => setAssignCareRecipientId(e.target.value)}
                        placeholder="예: 100"
                        required
                      />
                    </label>

                    <label>
                      활동지원사
                      {page.members.length > 0 ? (
                        <select
                          value={assignWorkerId}
                          onChange={(e) => setAssignWorkerId(e.target.value)}
                          required
                        >
                          <option value="">지원사를 선택해 주세요</option>
                          {page.members.map(m => (
                            <option key={m.id} value={m.userId ?? m.id}>
                              {m.name} ({m.publicCode || `#${m.userId ?? m.id}`})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={assignWorkerId}
                          onChange={(e) => setAssignWorkerId(e.target.value)}
                          placeholder="활동지원사 회원 ID"
                          required
                        />
                      )}
                    </label>

                    <label>
                      배정 시작일
                      <input
                        type="date"
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      배정 종료일 (선택)
                      <input
                        type="date"
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                      />
                    </label>

                    {assignError && <p className="error" role="alert">{assignError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowAssignModal(false)}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="btn"
                        style={{ flex: 1 }}
                        disabled={isAssigning}
                      >
                        {isAssigning ? '등록 중…' : '배정 등록'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
