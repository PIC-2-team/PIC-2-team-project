import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import TabBar from '../../components/TabBar/TabBar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  getMyOrganization,
  getMembers,
  getAssignments,
  registerOrganization,
  assignSupportWorker,
  endAssignment,
  getOrganizationRecipients,
  createOrganizationRecipient,
  updateOrganizationRecipient,
  deleteOrganizationRecipient,
  addMember,
  updateMemberStatus,
  removeMember,
} from '../../api/organizations';
import { ApiError } from '../../api/client';
import type { Organization, OrganizationMember, CareAssignment, OrganizationCareRecipient } from '../../types/agency';

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
    };

export function AgencyDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState<PageState>({ status: 'loading' });
  const [orgCode, setOrgCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // 배정 모달 상태
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCareRecipientId, setAssignCareRecipientId] = useState('');
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // 돌봄 대상자 추가/수정 모달 상태
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<OrganizationCareRecipient | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientBirthDate, setRecipientBirthDate] = useState('2000-01-01');
  const [recipientGender, setRecipientGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [recipientGrade, setRecipientGrade] = useState<string>('1');
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // 돌봄지원사 추가 모달 상태
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // ConfirmDialog 상태
  const [showEndAssignmentDialog, setShowEndAssignmentDialog] = useState(false);
  const [endAssignmentTarget, setEndAssignmentTarget] = useState<{ id: number; label: string } | null>(null);
  const [endAssignmentError, setEndAssignmentError] = useState<string | null>(null);

  const [showDeleteRecipientDialog, setShowDeleteRecipientDialog] = useState(false);
  const [deleteRecipientTarget, setDeleteRecipientTarget] = useState<OrganizationCareRecipient | null>(null);
  const [deleteRecipientError, setDeleteRecipientError] = useState<string | null>(null);

  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<OrganizationMember | null>(null);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  const [toggleMemberError, setToggleMemberError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [org, members, assignments, recipients] = await Promise.all([
        getMyOrganization(),
        getMembers(),
        getAssignments(),
        getOrganizationRecipients().catch(() => [] as OrganizationCareRecipient[]),
      ]);
      setPage({ status: 'ok', org, members, assignments, recipients });
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
        const [org, members, assignments, recipients] = await Promise.all([
          getMyOrganization(),
          getMembers(),
          getAssignments(),
          getOrganizationRecipients().catch(() => [] as OrganizationCareRecipient[]),
        ]);
        if (active) setPage({ status: 'ok', org, members, assignments, recipients });
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

  // tab=workers 파라미터가 있을 때 스크롤
  useEffect(() => {
    if (searchParams.get('tab') === 'workers') {
      const el = document.getElementById('section-workers');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams, page.status]);

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

  // 배정 모달 열기
  const handleOpenAssignModal = () => {
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
      setAssignError('돌봄 대상자와 돌봄지원사, 시작일을 모두 선택해 주세요.');
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
  const handleEndAssignment = (assignmentId: number, workerLabel: string) => {
    setEndAssignmentTarget({ id: assignmentId, label: workerLabel });
    setShowEndAssignmentDialog(true);
  };

  const handleEndAssignmentConfirm = async () => {
    if (!endAssignmentTarget) return;
    setShowEndAssignmentDialog(false);
    setEndAssignmentError(null);
    try {
      await endAssignment(endAssignmentTarget.id);
      await fetchDashboardData();
    } catch (err) {
      setEndAssignmentError(err instanceof Error ? err.message : '배정 종료 처리에 실패했습니다.');
    } finally {
      setEndAssignmentTarget(null);
    }
  };

  // 돌봄 대상자 등록/수정 모달 열기
  const handleOpenRecipientModal = (recipient?: OrganizationCareRecipient) => {
    if (recipient) {
      setEditingRecipient(recipient);
      setRecipientName(recipient.name);
      setRecipientBirthDate(recipient.birthDate);
      setRecipientGender(recipient.gender || 'MALE');
      setRecipientGrade(recipient.disabilityGrade ? String(recipient.disabilityGrade) : '1');
    } else {
      setEditingRecipient(null);
      setRecipientName('');
      setRecipientBirthDate('2000-01-01');
      setRecipientGender('MALE');
      setRecipientGrade('1');
    }
    setRecipientError(null);
    setShowRecipientModal(true);
  };

  // 돌봄 대상자 저장
  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setRecipientError('이름을 입력해 주세요.');
      return;
    }
    setIsSavingRecipient(true);
    setRecipientError(null);
    try {
      if (editingRecipient) {
        await updateOrganizationRecipient(editingRecipient.id, {
          name: recipientName.trim(),
          birthDate: recipientBirthDate,
          gender: recipientGender,
          disabilityGrade: recipientGrade ? Number(recipientGrade) : null,
        });
      } else {
        await createOrganizationRecipient({
          name: recipientName.trim(),
          birthDate: recipientBirthDate,
          gender: recipientGender,
          disabilityGrade: recipientGrade ? Number(recipientGrade) : null,
          disabilityTypes: ['INTELLECTUAL'],
        });
      }
      setShowRecipientModal(false);
      await fetchDashboardData();
    } catch (err) {
      setRecipientError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSavingRecipient(false);
    }
  };

  // 돌봄 대상자 삭제
  const handleDeleteRecipient = (recipient: OrganizationCareRecipient) => {
    setDeleteRecipientTarget(recipient);
    setShowDeleteRecipientDialog(true);
  };

  const handleDeleteRecipientConfirm = async () => {
    if (!deleteRecipientTarget) return;
    setShowDeleteRecipientDialog(false);
    setDeleteRecipientError(null);
    try {
      await deleteOrganizationRecipient(deleteRecipientTarget.id);
      await fetchDashboardData();
    } catch (err) {
      setDeleteRecipientError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleteRecipientTarget(null);
    }
  };

  // 돌봄지원사 추가
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const userIdNum = Number(newMemberUserId.trim());
    if (!userIdNum) {
      setMemberError('사용자 ID를 올바르게 입력해 주세요.');
      return;
    }
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await addMember(userIdNum);
      setShowMemberModal(false);
      setNewMemberUserId('');
      await fetchDashboardData();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '돌봄지원사 추가에 실패했습니다.');
    } finally {
      setIsAddingMember(false);
    }
  };

  // 돌봄지원사 상태 토글
  const handleToggleMemberStatus = async (member: OrganizationMember) => {
    const nextActive = member.status !== 'ACTIVE';
    setToggleMemberError(null);
    try {
      await updateMemberStatus(member.id, nextActive);
      await fetchDashboardData();
    } catch (err) {
      setToggleMemberError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    }
  };

  // 돌봄지원사 삭제(소속 해제)
  const handleRemoveMember = (member: OrganizationMember) => {
    setRemoveMemberTarget(member);
    setShowRemoveMemberDialog(true);
  };

  const handleRemoveMemberConfirm = async () => {
    if (!removeMemberTarget) return;
    setShowRemoveMemberDialog(false);
    setRemoveMemberError(null);
    try {
      await removeMember(removeMemberTarget.id);
      await fetchDashboardData();
    } catch (err) {
      setRemoveMemberError(err instanceof Error ? err.message : '소속 해제에 실패했습니다.');
    } finally {
      setRemoveMemberTarget(null);
    }
  };

  return (
    <AppShell role={user?.role} footer={<TabBar role={user?.role ?? 'INSTITUTION'} />}>
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
              <button type="submit" className="btn" disabled={isSubmitting || orgCode.trim().length !== 6}>
                {isSubmitting ? '등록 중…' : '기관 등록하기'}
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

            {/* 돌봄 대상자 관리 섹션 */}
            <section className="demo-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>돌봄 대상자 ({page.recipients.length}명)</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '6px 12px' }}
                  onClick={() => handleOpenRecipientModal()}
                >
                  + 대상자 등록
                </button>
              </div>

              {page.recipients.length === 0 ? (
                <p className="empty-state">등록된 돌봄 대상자가 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.recipients.map((r) => (
                    <li
                      key={r.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--line)',
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                          onClick={() => handleOpenRecipientModal(r)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#c0392b' }}
                          onClick={() => handleDeleteRecipient(r)}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 돌봄지원사 관리 섹션 */}
            <section id="section-workers" className="demo-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>돌봄지원사 ({page.members.length}명)</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '6px 12px' }}
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
                <p className="empty-state">소속 돌봄지원사가 없어요.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {page.members.map((m) => (
                    <li
                      key={m.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--line)',
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
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: m.status === 'ACTIVE' ? '#e8f5e9' : '#f5f5f5',
                            color: m.status === 'ACTIVE' ? '#2e7d32' : '#757575',
                          }}
                        >
                          {m.status === 'ACTIVE' ? '활성' : '비활성'}
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
                          onClick={() => handleRemoveMember(m)}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 배정 현황 카드 */}
            <section className="demo-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>배정 현황 ({page.assignments.filter((a) => !a.endedAt).length}건 진행 중)</h2>
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
                  {page.assignments.map((a) => {
                    const isEnded = Boolean(a.endedAt);
                    const worker = page.members.find((m) => m.userId === a.supportWorkerId || m.id === a.supportWorkerId);
                    const workerLabel = worker ? `${worker.name} (#${a.supportWorkerId})` : `#${a.supportWorkerId}`;
                    const recipient = page.recipients.find((r) => r.id === a.careRecipientId);
                    const recipientLabel = recipient ? `${recipient.name} (#${a.careRecipientId})` : `이용자 #${a.careRecipientId}`;

                    return (
                      <li
                        key={a.id}
                        style={{
                          padding: '12px',
                          marginBottom: 8,
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          background: isEnded ? '#fafafa' : '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: '0.95rem' }}>{recipientLabel}</strong>
                              <span className="muted" style={{ fontSize: '0.85rem' }}>
                                · 지원사 {workerLabel}
                              </span>
                            </div>
                            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                              기간: {a.startDate} ~ {a.endDate || '종료일 없음'}
                              {a.endedAt && ` (종료일시: ${a.endedAt.slice(0, 10)})`}
                            </p>
                          </div>
                          <div>
                            {isEnded ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  background: '#eee',
                                  color: '#666',
                                }}
                              >
                                종료됨
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: '#e8f5e9',
                                    color: '#2e7d32',
                                    fontWeight: 600,
                                  }}
                                >
                                  진행 중
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#c0392b' }}
                                  onClick={() => handleEndAssignment(a.id, workerLabel)}
                                >
                                  배정 종료
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 돌봄 대상자 추가/수정 모달 */}
            {showRecipientModal && (
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
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>
                    {editingRecipient ? '돌봄 대상자 수정' : '돌봄 대상자 등록'}
                  </h2>
                  <form className="demo-form" onSubmit={(e) => { void handleSaveRecipient(e); }}>
                    <label>
                      이름 (필수)
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="예: 김철수"
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      생년월일
                      <input
                        type="date"
                        value={recipientBirthDate}
                        onChange={(e) => setRecipientBirthDate(e.target.value)}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      성별
                      <select
                        value={recipientGender}
                        onChange={(e) => setRecipientGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                      >
                        <option value="MALE">남성</option>
                        <option value="FEMALE">여성</option>
                        <option value="OTHER">기타</option>
                      </select>
                    </label>

                    <label style={{ marginTop: 12 }}>
                      장애 등급 (선택)
                      <select value={recipientGrade} onChange={(e) => setRecipientGrade(e.target.value)}>
                        <option value="1">1급 / 중증</option>
                        <option value="2">2급</option>
                        <option value="3">3급</option>
                      </select>
                    </label>

                    {recipientError && <p className="error" role="alert">{recipientError}</p>}

                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setShowRecipientModal(false)}
                      >
                        취소
                      </button>
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSavingRecipient}>
                        {isSavingRecipient ? '저장 중…' : '저장하기'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 돌봄지원사 추가 모달 */}
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
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>돌봄지원사 추가</h2>
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

            {/* 배정하기 모달 (입력된 대상자/지원사 목록 중에서 드롭다운 선택) */}
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
                    maxWidth: 400,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>돌봄지원사 배정</h2>
                  <form className="demo-form" onSubmit={(e) => { void handleCreateAssignment(e); }}>
                    <label>
                      돌봄 대상자
                      {page.recipients.length > 0 ? (
                        <select
                          value={assignCareRecipientId}
                          onChange={(e) => setAssignCareRecipientId(e.target.value)}
                          required
                        >
                          {page.recipients.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.careRecipientNumber || `#${r.id}`})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={assignCareRecipientId}
                          onChange={(e) => setAssignCareRecipientId(e.target.value)}
                          placeholder="돌봄 대상자 ID 직접 입력"
                          required
                        />
                      )}
                    </label>

                    <label style={{ marginTop: 12 }}>
                      돌봄지원사
                      <select
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

                    <label style={{ marginTop: 12 }}>
                      배정 시작일
                      <input
                        type="date"
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      배정 종료일 (선택)
                      <input
                        type="date"
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        placeholder="종료일 없음"
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
                      <button type="submit" className="btn" style={{ flex: 1 }} disabled={isAssigning}>
                        {isAssigning ? '등록 중…' : '배정 등록'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {endAssignmentError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{endAssignmentError}</p>}
        {deleteRecipientError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{deleteRecipientError}</p>}
        {removeMemberError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{removeMemberError}</p>}
        {toggleMemberError && <p role="alert" className="error" style={{ marginTop: '0.5rem' }}>{toggleMemberError}</p>}

        <ConfirmDialog
          open={showEndAssignmentDialog}
          title="배정을 종료하시겠습니까?"
          description="종료 즉시 정보 접근이 차단됩니다."
          confirmLabel="종료"
          variant="danger"
          onConfirm={() => { void handleEndAssignmentConfirm(); }}
          onCancel={() => { setShowEndAssignmentDialog(false); setEndAssignmentTarget(null); }}
        />
        <ConfirmDialog
          open={showDeleteRecipientDialog}
          title="대상자를 삭제하시겠습니까?"
          description="기관 목록에서 연결이 해제됩니다."
          confirmLabel="삭제"
          variant="danger"
          onConfirm={() => { void handleDeleteRecipientConfirm(); }}
          onCancel={() => { setShowDeleteRecipientDialog(false); setDeleteRecipientTarget(null); }}
        />
        <ConfirmDialog
          open={showRemoveMemberDialog}
          title="지원사를 소속 해제하시겠습니까?"
          confirmLabel="소속 해제"
          variant="danger"
          onConfirm={() => { void handleRemoveMemberConfirm(); }}
          onCancel={() => { setShowRemoveMemberDialog(false); setRemoveMemberTarget(null); }}
        />
      </main>
    </AppShell>
  );
}
