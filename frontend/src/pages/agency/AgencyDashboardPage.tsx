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
  updateMember,
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

// 지원사 카드 전용 액션 버튼 컴포넌트 (상단 "+ 지원사 추가" 버튼과 차별화된 디자인)
interface CardActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

function CardActionButton({ label, onClick, variant = 'default' }: CardActionButtonProps) {
  let background = '#f8fafc';
  let color = '#475569';
  let border = '1px solid #e2e8f0';

  if (variant === 'danger') {
    background = '#fff1f2';
    color = '#e11d48';
    border = '1px solid #fecdd3';
  } else if (variant === 'success') {
    background = '#f0fdf4';
    color = '#16a34a';
    border = '1px solid #bbf7d0';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '7px 0',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderRadius: 8,
        border,
        background,
        color,
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

// 배정 종료 전용 버튼 컴포넌트
function EndAssignmentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 10px',
        fontSize: '0.74rem',
        fontWeight: 600,
        borderRadius: 6,
        border: '1px solid #fecdd3',
        background: '#fff1f2',
        color: '#e11d48',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        transition: 'all 0.15s ease',
      }}
    >
      배정 종료
    </button>
  );
}

export function AgencyDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const [orgCode, setOrgCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const currentTab = searchParams.get('tab') || 'home';

  // 돌봄 보호자 등록 모달 상태 (전화번호 기반)
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardianPhone, setGuardianPhone] = useState('');
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

  // 배정 서브 탭 (배정 현황 vs 배정 기록)
  const [assignmentSubTab, setAssignmentSubTab] = useState<'active' | 'history'>('active');

  // 돌봄 지원사 추가 모달 상태
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // 돌봄 지원사 수정 모달 상태 (Update)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberError, setEditMemberError] = useState<string | null>(null);

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
    setGuardianPhone('');
    setGuardianError(null);
    setShowGuardianModal(true);
  };

  // 돌봄 보호자 등록 제출 (전화번호 기반)
  const handleRegisterGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneInput = guardianPhone.trim().replace(/[-\s]/g, '');
    if (!phoneInput || !/^01[0-9]{8,9}$/.test(phoneInput)) {
      setGuardianError('올바른 보호자 전화번호를 입력해 주세요. (예: 010-1234-5678)');
      return;
    }
    setIsRegisteringGuardian(true);
    setGuardianError(null);
    try {
      await registerOrganizationGuardian({ phone: guardianPhone.trim() });
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

  // 돌봄 지원사 추가 모달 열기
  const handleOpenMemberModal = () => {
    setNewMemberName('');
    setNewMemberPhone('');
    setMemberError(null);
    setShowMemberModal(true);
  };

  // 돌봄 지원사 추가 제출 (이름 기반 -> 고유 코드 자동 발급)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      setMemberError('돌봄 지원사 성명을 입력해 주세요.');
      return;
    }
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await addMember({
        name: newMemberName.trim(),
        phone: newMemberPhone.trim() || undefined,
      });
      setShowMemberModal(false);
      await fetchDashboardData();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '지원사 추가에 실패했습니다.');
    } finally {
      setIsAddingMember(false);
    }
  };

  // 돌봄 지원사 수정 모달 열기
  const handleOpenEditMemberModal = (member: OrganizationMember) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberPhone(member.phone || '');
    setEditMemberError(null);
    setShowEditMemberModal(true);
  };

  // 돌봄 지원사 수정 제출
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberName.trim()) {
      setEditMemberError('돌봄 지원사 성명을 입력해 주세요.');
      return;
    }
    setIsEditingMember(true);
    setEditMemberError(null);
    try {
      await updateMember(editingMember.id, {
        name: editMemberName.trim(),
        phone: editMemberPhone.trim() || undefined,
      });
      setShowEditMemberModal(false);
      setEditingMember(null);
      await fetchDashboardData();
    } catch (err) {
      setEditMemberError(err instanceof Error ? err.message : '지원사 정보 수정에 실패했습니다.');
    } finally {
      setIsEditingMember(false);
    }
  };

  // 돌봄 지원사 상태 변경 (활성화/비활성화)
  const handleToggleMemberStatus = async (member: OrganizationMember) => {
    const nextActive = member.status !== 'ACTIVE';
    const actionLabel = nextActive ? '활성화' : '비활성화';
    if (!window.confirm(`'${member.name}' 지원사를 ${actionLabel} 처리하시겠습니까?`)) {
      return;
    }
    try {
      await updateMember(member.id, { active: nextActive });
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
      <main className="demo-page" style={{ padding: '16px 14px 80px', maxWidth: 390, margin: '0 auto', boxSizing: 'border-box' }}>
        {page.status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p className="muted">기관 정보를 불러오는 중입니다…</p>
          </div>
        )}

        {page.status === 'error' && (
          <div className="demo-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p className="error" role="alert" style={{ margin: '0 0 16px' }}>{page.message}</p>
            <button type="button" className="btn" onClick={() => void fetchDashboardData()}>
              다시 시도
            </button>
          </div>
        )}

        {page.status === 'not_found' && (
          <div className="demo-card" style={{ padding: '20px 16px' }}>
            <h2 style={{ fontSize: '1.15rem', marginTop: 0 }}>소속 기관을 등록해 주세요</h2>
            <p className="muted" style={{ fontSize: '0.82rem' }}>
              기관 대시보드를 이용하려면 슈퍼 어드민에서 발급받은 6자리 기관 코드를 등록해야 합니다.
            </p>
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
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.3rem' }}>🏢</span>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{page.org.name}</h2>
              </div>
              <p className="muted" style={{ margin: '4px 0 0 28px', fontSize: '0.85rem' }}>
                기관 코드: <strong>{page.org.organizationCode}</strong>
              </p>
            </div>

            {/* TAB: 홈 대시보드 */}
            {currentTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 숫자 요약 통계 카드 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 10,
                  }}
                >
                  <div
                    className="demo-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.78rem' }}>등록 돌봄 보호자</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: 2, color: '#2e7d32' }}>
                      {page.guardians.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.78rem' }}>관리 돌봄 대상자</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: 2, color: '#3CAB7E' }}>
                      {page.recipients.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.78rem' }}>소속 돌봄 지원사</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: 2, color: '#1976d2' }}>
                      {page.members.length}명
                    </div>
                  </div>

                  <div
                    className="demo-card"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--surface-color, #f8fbf9)',
                      border: '1px solid var(--line, #e2ece6)',
                    }}
                  >
                    <span className="muted" style={{ fontSize: '0.78rem' }}>진행 중 배정</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: 2, color: '#e67e22' }}>
                      {page.assignments.filter((a) => !a.endedAt).length}건
                    </div>
                  </div>
                </div>

                {/* 돌봄 보호자 관리 섹션 */}
                <section className="demo-card" style={{ padding: '16px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>돌봄 보호자 ({page.guardians.length}명)</h2>
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem', lineHeight: 1.45 }}>
                        보호자를 등록하면<br />
                        보호자가 당사자를 직접 등록합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={handleOpenGuardianModal}
                    >
                      + 보호자 등록
                    </button>
                  </div>

                  {page.guardians.length === 0 ? (
                    <div
                      style={{
                        padding: '20px 14px',
                        textAlign: 'center',
                        background: '#fafbfc',
                        borderRadius: 10,
                        border: '1px dashed #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: '1.35rem', marginBottom: 4 }}>👥</div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                        등록된 돌봄 보호자가 없어요
                      </p>
                      <p className="muted" style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.45 }}>
                        상단의 <strong>+ 보호자 등록</strong> 버튼을 눌러<br />
                        보호자를 등록해 주세요.
                      </p>
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {page.guardians.map((g) => (
                        <li
                          key={g.id}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--line, #eee)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ fontSize: '0.92rem' }}>{g.name}</strong>
                              <span className="muted" style={{ fontSize: '0.8rem' }}>
                                ({g.phone || g.publicCode || g.email || `#${g.guardianId}`})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>
                              {g.careRecipients && g.careRecipients.length > 0 ? (
                                <span>
                                  당사자: {g.careRecipients.map((r) => r.name).join(', ')} ({g.careRecipients.length}명)
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
                              style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#c0392b' }}
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
                <section className="demo-card" style={{ padding: '16px 14px' }}>
                  <div style={{ marginBottom: 10 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>돌봄 대상자 현황 ({page.recipients.length}명)</h2>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>
                      돌봄 보호자가 등록한 당사자 목록입니다.
                    </p>
                  </div>

                  {page.recipients.length === 0 ? (
                    <p className="empty-state" style={{ fontSize: '0.85rem' }}>
                      등록된 돌봄 대상자가 없어요. 돌봄 보호자가 당사자를 등록하면 이곳에 자동으로 연동됩니다.
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {page.recipients.map((r) => {
                        // 당사자를 등록한 돌봄 보호자 정보 탐색 (백엔드 제공 정보 또는 guardians 연동 목록 매칭)
                        const registeredGuardian =
                          (r.guardianName ? { name: r.guardianName, phone: r.guardianPhone } : null) ||
                          page.guardians.find((g) => g.careRecipients?.some((cr) => cr.id === r.id));

                        return (
                          <li
                            key={r.id}
                            style={{
                              padding: '12px 0',
                              borderBottom: '1px solid var(--line, #eee)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.94rem', color: '#1a1a1a' }}>{r.name}</strong>
                                <span className="muted" style={{ fontSize: '0.82rem' }}>
                                  ({r.careRecipientNumber || `#${r.id}`})
                                </span>
                                <span className="muted" style={{ fontSize: '0.78rem' }}>
                                  · {r.birthDate}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#2e7d32', marginTop: 4, fontWeight: 500 }}>
                                {registeredGuardian ? (
                                  <span>
                                    보호자: {registeredGuardian.name}
                                    {registeredGuardian.phone ? ` (${registeredGuardian.phone})` : ''}
                                  </span>
                                ) : (
                                  <span className="muted" style={{ fontWeight: 400 }}>
                                    보호자: 등록 정보 확인 중
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="badge" style={{ fontSize: '0.74rem', flexShrink: 0 }}>관리 중</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {/* TAB: 돌봄 지원사 관리 (CRUD) */}
            {currentTab === 'workers' && (
              <section id="section-workers" className="demo-card" style={{ padding: '16px 14px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>돌봄 지원사 관리 ({page.members.length}명)</h2>
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem', lineHeight: 1.45 }}>
                        기관에 소속된 돌봄 지원사를 조회하고<br />
                        활성화 상태를 관리합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={handleOpenMemberModal}
                    >
                      + 지원사 추가
                    </button>
                  </div>
                </div>

                {page.members.length === 0 ? (
                  <p className="empty-state" style={{ fontSize: '0.85rem' }}>소속 돌봄 지원사가 없어요.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {page.members.map((m) => (
                      <li
                        key={m.id}
                        style={{
                          padding: '12px',
                          marginBottom: 8,
                          borderRadius: 10,
                          background: '#fafbfc',
                          border: '1px solid var(--line, #eee)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {/* 1행: 성명, 고유 코드 및 상태 뱃지 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#1a1a1a' }}>{m.name}</strong>
                            <span className="muted" style={{ fontSize: '0.82rem' }}>
                              ({m.publicCode || `#${m.id}`})
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: m.status === 'ACTIVE' ? '#e8f5e9' : '#ffebee',
                              color: m.status === 'ACTIVE' ? '#2e7d32' : '#c62828',
                              flexShrink: 0,
                            }}
                          >
                            {m.status === 'ACTIVE' ? '활동 중' : '비활동'}
                          </span>
                        </div>

                        {/* 연락처가 있는 경우 아랫줄 표시 */}
                        {m.phone && (
                          <div className="muted" style={{ fontSize: '0.78rem' }}>
                            연락처: {m.phone}
                          </div>
                        )}

                        {/* 2행: 카드 전용 액션 버튼 컴포넌트 (가로 전체 꽉 차게 3등분 균등 배치) */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 6,
                            borderTop: '1px solid #f0f0f0',
                            paddingTop: 8,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <CardActionButton
                            label="수정"
                            variant="default"
                            onClick={() => handleOpenEditMemberModal(m)}
                          />
                          <CardActionButton
                            label={m.status === 'ACTIVE' ? '비활성화' : '활성화'}
                            variant={m.status === 'ACTIVE' ? 'default' : 'success'}
                            onClick={() => void handleToggleMemberStatus(m)}
                          />
                          <CardActionButton
                            label="삭제"
                            variant="danger"
                            onClick={() => void handleRemoveMember(m)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* TAB: 배정 */}
            {currentTab === 'assignments' && (() => {
              const activeAssignments = page.assignments.filter((a) => !a.endedAt);
              const historyAssignments = page.assignments.filter((a) => Boolean(a.endedAt));
              const displayAssignments = assignmentSubTab === 'active' ? activeAssignments : historyAssignments;

              return (
                <section className="demo-card" style={{ padding: '16px 14px' }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>돌봄 지원사 배정 ({page.assignments.length}건)</h2>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem', lineHeight: 1.45 }}>
                          돌봄 대상자에게 소속 돌봄 지원사를<br />
                          1:1로 배정하고 관리합니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: '0.82rem', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={handleOpenAssignModal}
                      >
                        + 배정하기
                      </button>
                    </div>
                  </div>

                  {/* 현황 vs 기록 관리 서브 탭 */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginBottom: 12,
                      borderBottom: '1px solid var(--line, #eee)',
                      paddingBottom: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAssignmentSubTab('active')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: assignmentSubTab === 'active' ? 700 : 500,
                        borderRadius: 8,
                        border: 'none',
                        background: assignmentSubTab === 'active' ? '#3CAB7E' : '#f0f4f2',
                        color: assignmentSubTab === 'active' ? '#fff' : '#555',
                        cursor: 'pointer',
                      }}
                    >
                      배정 현황 ({activeAssignments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentSubTab('history')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: assignmentSubTab === 'history' ? 700 : 500,
                        borderRadius: 8,
                        border: 'none',
                        background: assignmentSubTab === 'history' ? '#3CAB7E' : '#f0f4f2',
                        color: assignmentSubTab === 'history' ? '#fff' : '#555',
                        cursor: 'pointer',
                      }}
                    >
                      배정 기록 ({historyAssignments.length})
                    </button>
                  </div>

                  {displayAssignments.length === 0 ? (
                    <p className="empty-state" style={{ fontSize: '0.85rem' }}>
                      {assignmentSubTab === 'active'
                        ? '현재 진행 중인 배정 내역이 없어요.'
                        : '종료된 배정 기록이 없어요.'}
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {displayAssignments.map((a) => {
                        const recipient = page.recipients.find((r) => r.id === a.careRecipientId);
                        const worker = page.members.find((m) => (m.userId ?? m.id) === a.supportWorkerId);
                        const isEnded = Boolean(a.endedAt);
                        const recipientCode = recipient?.careRecipientNumber || (recipient ? `#${recipient.id}` : `#${a.careRecipientId}`);
                        const recipientLabel = recipient ? `${recipient.name} (${recipientCode})` : `이용자 #${a.careRecipientId}`;
                        const workerCode = worker?.publicCode || (worker ? `#${worker.userId ?? worker.id}` : `#${a.supportWorkerId}`);
                        const workerLabel = worker ? `${worker.name} (${workerCode})` : `지원사 #${a.supportWorkerId}`;

                        return (
                          <li
                            key={a.id}
                            style={{
                              padding: '12px',
                              marginBottom: 8,
                              borderRadius: 10,
                              background: '#fafbfc',
                              border: '1px solid var(--line, #eee)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              opacity: isEnded ? 0.75 : 1,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1a1a1a' }}>
                                    {recipientLabel}
                                  </div>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: 500 }}>담당:</span>
                                    <span>{workerLabel}</span>
                                  </div>
                                </div>
                                <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                                  기간: {a.startDate} ~ {a.endDate || '종료일 미정'}
                                  {isEnded && (
                                    <span style={{ marginLeft: 6, color: '#c0392b', fontWeight: 600 }}>
                                      (종료됨)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                {!isEnded ? (
                                  <EndAssignmentButton
                                    onClick={() => void handleEndAssignment(a.id, workerLabel)}
                                  />
                                ) : (
                                  <span
                                    className="muted"
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '3px 6px',
                                      background: '#eee',
                                      borderRadius: 4,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    종료됨
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })()}

            {/* 돌봄 보호자 등록 모달 */}
            {showGuardianModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 12,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 360,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '20px 16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
                    boxSizing: 'border-box',
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: '1.15rem' }}>돌봄 보호자 등록</h2>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                    등록할 보호자의 전화번호를 입력하세요. 등록된 보호자가 앱에서 당사자를 등록하면 이곳에서 함께 관리할 수 있습니다.
                  </p>
                  <form className="demo-form" onSubmit={(e) => { void handleRegisterGuardian(e); }}>
                    <label>
                      보호자 전화번호
                      <input
                        type="tel"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="예: 010-1234-5678"
                        required
                        autoFocus
                      />
                    </label>

                    {guardianError && <p className="error" role="alert" style={{ fontSize: '0.82rem', marginTop: 8 }}>{guardianError}</p>}

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

            {/* 돌봄 지원사 추가 모달 (Create) */}
            {showMemberModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 12,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 360,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '20px 16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
                    boxSizing: 'border-box',
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: '1.15rem' }}>돌봄 지원사 추가</h2>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                    지원사 이름을 등록하면 돌봄 지원사 고유 코드(S-XXXX)가 자동으로 발급됩니다.
                  </p>
                  <form className="demo-form" onSubmit={(e) => { void handleAddMember(e); }}>
                    <label>
                      지원사 성명 (필수)
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="예: 이지원"
                        required
                        autoFocus
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      지원사 연락처 (선택)
                      <input
                        type="tel"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="예: 010-1234-5678"
                      />
                    </label>

                    {memberError && <p className="error" role="alert" style={{ fontSize: '0.82rem', marginTop: 8 }}>{memberError}</p>}

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

            {/* 돌봄 지원사 수정 모달 (Update) */}
            {showEditMemberModal && editingMember && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 12,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 360,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '20px 16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
                    boxSizing: 'border-box',
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: '1.15rem' }}>돌봄 지원사 정보 수정</h2>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0, marginBottom: 14 }}>
                    고유 코드: <strong>{editingMember.publicCode || `#${editingMember.id}`}</strong>
                  </p>
                  <form className="demo-form" onSubmit={(e) => { void handleEditMember(e); }}>
                    <label>
                      지원사 성명
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        placeholder="예: 이지원"
                        required
                        autoFocus
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      연락처 (선택)
                      <input
                        type="tel"
                        value={editMemberPhone}
                        onChange={(e) => setEditMemberPhone(e.target.value)}
                        placeholder="예: 010-1234-5678"
                      />
                    </label>

                    {editMemberError && <p className="error" role="alert" style={{ fontSize: '0.82rem', marginTop: 8 }}>{editMemberError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowEditMemberModal(false)}
                      >
                        취소
                      </button>
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={isEditingMember}>
                        {isEditingMember ? '저장 중…' : '저장하기'}
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
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 12,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="demo-card"
                  style={{
                    maxWidth: 360,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '20px 16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
                    boxSizing: 'border-box',
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: '1.15rem' }}>돌봄 지원사 배정</h2>
                  <form className="demo-form" onSubmit={(e) => { void handleCreateAssignment(e); }}>
                    {/* 돌봄 대상자 선택 영역 */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        돌봄 대상자
                      </label>

                      {page.recipients.length > 0 ? (
                        <>
                          <input
                            type="text"
                            value={recipientSearchQuery}
                            onChange={(e) => setRecipientSearchQuery(e.target.value)}
                            placeholder="대상자 이름 또는 번호 검색…"
                            style={{ marginBottom: 6, fontSize: '0.82rem' }}
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
                            padding: '10px 12px',
                            background: '#fff3cd',
                            border: '1px solid #ffeeba',
                            borderRadius: 8,
                            fontSize: '0.82rem',
                            color: '#856404',
                            lineHeight: 1.45,
                          }}
                        >
                          등록된 돌봄 대상자가 없습니다. 돌봄 보호자가 당사자를 등록해야 지원사를 배정할 수 있습니다.
                        </div>
                      )}
                    </div>

                    {/* 돌봄 지원사 선택 영역 */}
                    <label style={{ marginTop: 12, fontWeight: 600 }}>
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

                    <label style={{ marginTop: 12, fontWeight: 600 }}>
                      배정 시작일
                      <input
                        type="date"
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12, fontWeight: 600 }}>
                      배정 종료일 (선택)
                      <input
                        type="date"
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        placeholder="종료일 없음"
                      />
                    </label>

                    {assignError && <p className="error" role="alert" style={{ fontSize: '0.82rem', marginTop: 8 }}>{assignError}</p>}

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
