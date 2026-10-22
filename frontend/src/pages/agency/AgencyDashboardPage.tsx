import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';
import {
  getMyOrganization,
  getMembers,
  getAssignments,
  registerOrganization,
  assignSupportWorker,
  endAssignment,
  getOrganizationRecipients,
  getOrganizationGuardians,
  registerOrganizationGuardian,
  removeOrganizationGuardian,
  addMember,
  updateMemberStatus,
  removeMember,
} from '../../api/organizations';
import { ApiError } from '../../api/client';
import type {
  Organization,
  OrganizationMember,
  CareAssignment,
  OrganizationCareRecipient,
  OrganizationGuardian,
} from '../../types/agency';

type PageState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      org: Organization;
      members: OrganizationMember[];
      assignments: CareAssignment[];
      recipients: OrganizationCareRecipient[];
      guardians: OrganizationGuardian[];
    };

export function AgencyDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const [orgCode, setOrgCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const currentTab = searchParams.get('tab') || 'home';

  // 돌봄 보호자 등록 모달 상태
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardianCodeOrEmail, setGuardianCodeOrEmail] = useState('');
  const [isRegisteringGuardian, setIsRegisteringGuardian] = useState(false);
  const [guardianError, setGuardianError] = useState<string | null>(null);

  // 배정 모달 상태
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCareRecipientId, setAssignCareRecipientId] = useState('');
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('');
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // 돌봄 지원사 추가 모달 상태
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [org, members, assignments, recipients, guardians] = await Promise.all([
        getMyOrganization(),
        getMembers(),
        getAssignments(),
        getOrganizationRecipients().catch(() => [] as OrganizationCareRecipient[]),
        getOrganizationGuardians().catch(() => [] as OrganizationGuardian[]),
      ]);
      setPage({
        status: 'ok',
        org,
        members: Array.isArray(members) ? members : [],
        assignments: Array.isArray(assignments) ? assignments : [],
        recipients: Array.isArray(recipients) ? recipients : [],
        guardians: Array.isArray(guardians) ? guardians : [],
      });
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
        const [org, members, assignments, recipients, guardians] = await Promise.all([
          getMyOrganization(),
          getMembers(),
          getAssignments(),
          getOrganizationRecipients().catch(() => [] as OrganizationCareRecipient[]),
          getOrganizationGuardians().catch(() => [] as OrganizationGuardian[]),
        ]);
        if (active) {
          setPage({
            status: 'ok',
            org,
            members: Array.isArray(members) ? members : [],
            assignments: Array.isArray(assignments) ? assignments : [],
            recipients: Array.isArray(recipients) ? recipients : [],
            guardians: Array.isArray(guardians) ? guardians : [],
          });
        }
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 404 || e.code === 'ORGANIZATION_NOT_FOUND')) {
          setPage({ status: 'not_found' });
        } else {
          setPage({ status: 'error', message: e instanceof Error ? e.message : '불러오기 실패' });
        }
      }
    })();
    return () => {
      active = false;
    };
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

  // 돌봄 보호자 등록 모달 열기
  const handleOpenGuardianModal = () => {
    setGuardianCodeOrEmail('');
    setGuardianError(null);
    setShowGuardianModal(true);
  };

  // 돌봄 보호자 등록 제출
  const handleRegisterGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = guardianCodeOrEmail.trim();
    if (!query) {
      setGuardianError('보호자 식별 코드 또는 이메일을 입력해 주세요.');
      return;
    }
    setIsRegisteringGuardian(true);
    setGuardianError(null);
    try {
      await registerOrganizationGuardian({ guardianCodeOrEmail: query });
      setShowGuardianModal(false);
      await fetchDashboardData();
    } catch (err) {
      setGuardianError(err instanceof Error ? err.message : '보호자 등록에 실패했습니다.');
    } finally {
      setIsRegisteringGuardian(false);
    }
  };

  // 돌봄 보호자 연결 해제
  const handleRemoveGuardian = async (guardian: OrganizationGuardian) => {
    if (!window.confirm(`'${guardian.name}' 돌봄 보호자의 연결을 해제하시겠습니까?`)) {
      return;
    }
    try {
      await removeOrganizationGuardian(guardian.guardianId);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '보호자 연결 해제에 실패했습니다.');
    }
  };

  // 배정 모달 열기
  const handleOpenAssignModal = () => {
    setRecipientSearchQuery('');
    if (page.status === 'ok') {
      if (page.recipients.length > 0) {
        setAssignCareRecipientId(String(page.recipients[0].id));
      } else {
        setAssignCareRecipientId('');
      }
      if (page.members.length > 0) {
        setAssignWorkerId(String(page.members[0].userId ?? page.members[0].id));
      } else {
        setAssignWorkerId('');
      }
    }
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setAssignEndDate('');
    setAssignError(null);
    setShowAssignModal(true);
  };

  // 배정 등록 제출
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipientIdNum = Number(assignCareRecipientId);
    const workerIdNum = Number(assignWorkerId);
    if (!recipientIdNum || !workerIdNum || !assignStartDate) {
      setAssignError('돌봄 대상자와 돌봄 지원사, 시작일을 모두 선택해 주세요.');
      return;
    }
    setIsAssigning(true);
    setAssignError(null);
    try {
      await assignSupportWorker({
        careRecipientId: recipientIdNum,
        supportWorkerId: workerIdNum,
        startDate: assignStartDate,
        endDate: assignEndDate.trim() ? assignEndDate : null,
      });
      setShowAssignModal(false);
      await fetchDashboardData();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : '배정 등록에 실패했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  // 배정 종료 처리
  const handleEndAssignment = async (assignmentId: number, workerLabel: string) => {
    if (!window.confirm(`'${workerLabel}' 지원사의 배정을 종료하시겠습니까? 종료 즉시 정보 접근이 차단됩니다.`)) {
      return;
    }
    try {
      await endAssignment(assignmentId);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '배정 종료 처리에 실패했습니다.');
    }
  };

  // 돌봄 지원사 추가 제출
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(newMemberUserId.trim());
    if (!uid) {
      setMemberError('사용자 ID를 올바르게 입력해 주세요.');
      return;
    }
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await addMember(uid);
      setShowMemberModal(false);
      await fetchDashboardData();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '지원사 추가에 실패했습니다.');
    } finally {
      setIsAddingMember(false);
    }
  };

  // 돌봄 지원사 상태 변경 (활성/비활성)
  const handleToggleMemberStatus = async (member: OrganizationMember) => {
    const nextActive = member.status !== 'ACTIVE';
    const actionLabel = nextActive ? '활성화' : '비활성화';
    if (!window.confirm(`'${member.name}' 지원사를 ${actionLabel} 처리하시겠습니까?`)) {
      return;
    }
    try {
      await updateMemberStatus(member.id, nextActive);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : `상태 변경에 실패했습니다.`);
    }
  };

  // 돌봄 지원사 삭제
  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!window.confirm(`'${member.name}' 지원사를 기관 소속에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await removeMember(member.id);
      await fetchDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '지원사 삭제에 실패했습니다.');
    }
  };

  // 필터링된 돌봄 대상자 목록 (배정 모달용)
  const filteredRecipients = useMemo(() => {
    if (page.status !== 'ok') return [];
    const query = recipientSearchQuery.trim().toLowerCase();
    if (!query) return page.recipients;
    return page.recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.careRecipientNumber && r.careRecipientNumber.toLowerCase().includes(query)) ||
        String(r.id).includes(query)
    );
  }, [page, recipientSearchQuery]);

  return (
    <AppShell role={user?.role} footer={<TabBar />}>
      <main className="demo-page" style={{ padding: '20px 16px 80px', maxWidth: 640, margin: '0 auto' }}>
        {page.status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p className="muted">기관 정보를 불러오는 중입니다…</p>
          </div>
        )}

        {page.status === 'error' && (
          <div className="demo-card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p className="error" role="alert" style={{ margin: '0 0 16px' }}>{page.message}</p>
            <button type="button" className="btn" onClick={() => void fetchDashboardData()}>
              다시 시도
            </button>
          </div>
        )}

        {page.status === 'not_found' && (
          <div className="demo-card" style={{ maxWidth: 440, margin: '40px auto', padding: '28px 20px' }}>
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
                  maxLength={6}
                  required
                />
              </label>
              {registerError && <p className="error" role="alert">{registerError}</p>}
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? '등록 중…' : '기관 등록하기'}
              </button>
            </form>
          </div>
        )}

        {page.status === 'ok' && (
          <>
            {/* 기관 헤더 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.4rem' }}>🏢</span>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{page.org.name}</h2>
              </div>
              <p className="muted" style={{ margin: '4px 0 0 32px', fontSize: '0.9rem' }}>
                기관 코드: <strong>{page.org.organizationCode}</strong>
              </p>
            </div>

            {/* TAB: 홈 대시보드 */}
            {currentTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 숫자 요약 통계 카드 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                  }}
                >
                  <div
                    className="demo-card"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.82rem' }}>등록 돌봄 보호자</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#2e7d32' }}>
                      {page.guardians.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.82rem' }}>관리 돌봄 대상자</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#3CAB7E' }}>
                      {page.recipients.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.82rem' }}>소속 돌봄 지원사</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#1976d2' }}>
                      {page.members.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.82rem' }}>진행 중 배정</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 4, color: '#e67e22' }}>
                      {page.assignments.filter((a) => !a.endedAt).length}건
                    </div>
                  </div>
                </div>

                {/* 돌봄 보호자 관리 섹션 */}
                <section className="demo-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.15rem' }}>돌봄 보호자 ({page.guardians.length}명)</h2>
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                        보호자를 등록하면 보호자가 앱에서 당사자를 직접 등록합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.88rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      onClick={handleOpenGuardianModal}
                    >
                      + 보호자 등록
                    </button>
                  </div>

                  {(page.guardians ?? []).length === 0 ? (
                    <p className="empty-state">
                      등록된 돌봄 보호자가 없어요. <strong>+ 보호자 등록</strong> 버튼을 눌러 보호자를 등록해 주세요.
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {(page.guardians ?? []).map((g) => (
                        <li
                          key={g.id}
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid var(--line, #eee)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong>{g.name}</strong>
                              <span className="muted" style={{ fontSize: '0.85rem' }}>
                                ({g.publicCode || g.email || `#${g.guardianId}`})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#555', marginTop: 4 }}>
                              {g.careRecipients && g.careRecipients.length > 0 ? (
                                <span>
                                  등록 당사자: {g.careRecipients.map((r) => r.name).join(', ')} ({g.careRecipients.length}명)
                                </span>
                              ) : (
                                <span className="muted">아직 당사자를 등록하지 않음</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#c0392b' }}
                              onClick={() => void handleRemoveGuardian(g)}
                            >
                              연결 해제
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* 관리 돌봄 대상자 목록 섹션 */}
                <section className="demo-card">
                  <div style={{ marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: '1.15rem' }}>돌봄 대상자 현황 ({page.recipients.length}명)</h2>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      돌봄 보호자가 등록한 당사자 목록입니다. 이 목록의 대상자에게 지원사를 배정할 수 있습니다.
                    </p>
                  </div>

                  {page.recipients.length === 0 ? (
                    <p className="empty-state">
                      등록된 돌봄 대상자가 없어요. 돌봄 보호자가 당사자를 등록하면 이곳에 자동으로 연동됩니다.
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {page.recipients.map((r) => (
                        <li
                          key={r.id}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--line, #eee)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <strong>{r.name}</strong>
                            <span className="muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                              {r.careRecipientNumber || `#${r.id}`} · {r.birthDate}
                            </span>
                          </div>
                          <span className="badge" style={{ fontSize: '0.78rem' }}>관리 중</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {/* TAB: 돌봄 지원사 관리 */}
            {currentTab === 'workers' && (
              <section id="section-workers" className="demo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem' }}>돌봄 지원사 관리 ({page.members.length}명)</h2>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      기관에 소속된 돌봄 지원사를 조회하고 활성화 상태를 관리합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.88rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setNewMemberUserId('');
                      setMemberError(null);
                      setShowMemberModal(true);
                    }}
                  >
                    + 지원사 추가
                  </button>
                </div>

                {page.members.length === 0 ? (
                  <p className="empty-state">소속 돌봄 지원사가 없어요.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {page.members.map((m) => (
                      <li
                        key={m.id}
                        style={{
                          padding: '12px 0',
                          borderBottom: '1px solid var(--line, #eee)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>{m.name}</strong>
                          <span className="muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                            ({m.publicCode || `#${m.id}`})
                          </span>
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: '0.78rem',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: m.status === 'ACTIVE' ? '#e8f5e9' : '#ffebee',
                              color: m.status === 'ACTIVE' ? '#2e7d32' : '#c62828',
                            }}
                          >
                            {m.status === 'ACTIVE' ? '활동 중' : '비활동'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                            onClick={() => void handleToggleMemberStatus(m)}
                          >
                            {m.status === 'ACTIVE' ? '비활성화' : '활성화'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#c0392b' }}
                            onClick={() => void handleRemoveMember(m)}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* TAB: 배정 */}
            {currentTab === 'assignments' && (
              <section className="demo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.15rem' }}>돌봄 지원사 배정 ({page.assignments.length}건)</h2>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                      돌봄 대상자에게 소속 돌봄 지원사를 1:1로 배정하고 관리합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: '0.88rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
                    onClick={handleOpenAssignModal}
                  >
                    + 배정하기
                  </button>
                </div>

                {page.assignments.length === 0 ? (
                  <p className="empty-state">현재 등록된 배정 내역이 없어요.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {page.assignments.map((a) => {
                      const recipient = page.recipients.find((r) => r.id === a.careRecipientId);
                      const worker = page.members.find((m) => (m.userId ?? m.id) === a.supportWorkerId);
                      const isEnded = Boolean(a.endedAt);
                      const recipientLabel = recipient ? `${recipient.name} (#${recipient.id})` : `이용자 #${a.careRecipientId}`;
                      const workerLabel = worker ? `${worker.name} (#${worker.userId ?? worker.id})` : `지원사 #${a.supportWorkerId}`;

                      return (
                        <li
                          key={a.id}
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid var(--line, #eee)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: isEnded ? 0.6 : 1,
                          }}
                        >
                          <div>
                            <div>
                              <strong>{recipientLabel}</strong>
                              <span style={{ margin: '0 6px', color: '#999' }}>←</span>
                              <span style={{ fontWeight: 600 }}>{workerLabel}</span>
                            </div>
                            <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                              기간: {a.startDate} ~ {a.endDate || '종료일 미정'}
                              {isEnded && (
                                <span style={{ marginLeft: 8, color: '#c0392b', fontWeight: 600 }}>
                                  (종료됨)
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            {!isEnded ? (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#c0392b' }}
                                onClick={() => void handleEndAssignment(a.id, workerLabel)}
                              >
                                배정 종료
                              </button>
                            ) : (
                              <span className="muted" style={{ fontSize: '0.8rem' }}>종료됨</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* 돌봄 보호자 등록 모달 */}
            {showGuardianModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 16,
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 420,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 8 }}>돌봄 보호자 등록</h2>
                  <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: 16 }}>
                    보호자의 공개 식별 코드(예: P-XXXX) 또는 이메일을 입력하세요. 기관에 등록된 보호자가 앱에서 당사자를 등록하면 이곳에서 함께 관리할 수 있습니다.
                  </p>
                  <form className="demo-form" onSubmit={(e) => { void handleRegisterGuardian(e); }}>
                    <label>
                      보호자 식별 코드 또는 이메일
                      <input
                        type="text"
                        value={guardianCodeOrEmail}
                        onChange={(e) => setGuardianCodeOrEmail(e.target.value)}
                        placeholder="예: P-ABCD1234 또는 guardian@email.com"
                        required
                        autoFocus
                      />
                    </label>

                    {guardianError && <p className="error" role="alert">{guardianError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowGuardianModal(false)}
                      >
                        취소
                      </button>
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={isRegisteringGuardian}>
                        {isRegisteringGuardian ? '등록 중…' : '등록하기'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 돌봄 지원사 추가 모달 */}
            {showMemberModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 16,
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 400,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>돌봄 지원사 추가</h2>
                  <form className="demo-form" onSubmit={(e) => { void handleAddMember(e); }}>
                    <label>
                      지원사 사용자 ID (숫자)
                      <input
                        type="number"
                        value={newMemberUserId}
                        onChange={(e) => setNewMemberUserId(e.target.value)}
                        placeholder="예: 2"
                        required
                      />
                    </label>
                    {memberError && <p className="error" role="alert">{memberError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowMemberModal(false)}
                      >
                        취소
                      </button>
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={isAddingMember}>
                        {isAddingMember ? '추가 중…' : '추가하기'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 배정하기 모달 */}
            {showAssignModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 16,
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 440,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>돌봄 지원사 배정</h2>
                  <form className="demo-form" onSubmit={(e) => { void handleCreateAssignment(e); }}>
                    {/* 돌봄 대상자 선택 영역 */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 4 }}>
                        돌봄 대상자
                      </label>

                      {page.recipients.length > 0 ? (
                        <>
                          <input
                            type="text"
                            value={recipientSearchQuery}
                            onChange={(e) => setRecipientSearchQuery(e.target.value)}
                            placeholder="대상자 이름 또는 번호 검색…"
                            style={{ marginBottom: 8, fontSize: '0.88rem' }}
                          />

                          <select
                            aria-label="돌봄 대상자"
                            value={assignCareRecipientId}
                            onChange={(e) => setAssignCareRecipientId(e.target.value)}
                            required
                          >
                            {filteredRecipients.length > 0 ? (
                              filteredRecipients.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.careRecipientNumber || `#${r.id}`})
                                </option>
                              ))
                            ) : (
                              <option disabled value="">검색 결과가 없습니다</option>
                            )}
                          </select>
                        </>
                      ) : (
                        <div
                          style={{
                            padding: '12px 14px',
                            background: '#fff3cd',
                            border: '1px solid #ffeeba',
                            borderRadius: 8,
                            fontSize: '0.85rem',
                            color: '#856404',
                          }}
                        >
                          등록된 돌봄 대상자가 없습니다. 먼저 돌봄 보호자를 등록하고, 보호자가 당사자를 등록해야 지원사를 배정할 수 있습니다.
                        </div>
                      )}
                    </div>

                    {/* 돌봄 지원사 선택 영역 */}
                    <label style={{ marginTop: 14 }}>
                      돌봄 지원사
                      <select
                        aria-label="돌봄 지원사"
                        value={assignWorkerId}
                        onChange={(e) => setAssignWorkerId(e.target.value)}
                        required
                      >
                        {page.members.map((m) => (
                          <option key={m.id} value={m.userId ?? m.id}>
                            {m.name} ({m.publicCode || `#${m.id}`})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ marginTop: 14 }}>
                      배정 시작일
                      <input
                        type="date"
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 14 }}>
                      배정 종료일 (선택)
                      <input
                        type="date"
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        placeholder="종료일 없음"
                      />
                    </label>

                    {assignError && <p className="error" role="alert">{assignError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
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
                        disabled={isAssigning || page.recipients.length === 0}
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
