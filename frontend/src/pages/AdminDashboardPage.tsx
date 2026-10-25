import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';
import {
  getAdminOrganizations,
  createAdminOrganization,
  updateAdminOrganization,
  deleteAdminOrganization,
  getAdminOrganizationRecords,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminUserRecords,
  getAdminCareRecipients,
  createAdminCareRecipient,
  type AdminOrganization,
  type AdminUserSummary,
  type AdminRecordSummary,
  type PaginatedAdminUsers,
  type AdminCareRecipient,
} from '../api/admin';
import { AppShell } from '../components/AppShell';
import { AdminTabBar, type AdminTabId } from '../components/AdminTabBar/AdminTabBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import styles from './AdminDashboardPage.module.css';

type Stats = {
  totalUsers: number;
  guardians: number;
  supportWorkers: number;
  institutions: number;
  totalOrganizations: number;
  totalCareRecipients: number;
  totalRecords: number;
};

const ROLE_LABELS: Record<string, string> = {
  GUARDIAN: '보호자',
  SUPPORT_WORKER: '활동지원사',
  INSTITUTION: '기관',
  ADMIN: '관리자',
};

const DISABILITY_LABELS: Record<string, string> = {
  INTELLECTUAL: '지적 장애',
  AUTISM: '자폐성 장애',
  OTHER: '기타 장애',
};

const RECORD_CATEGORY_LABELS: Record<string, string> = {
  MEAL: '식사',
  HEALTH: '건강/투약',
  EXCRETION: '배변',
  ACTIVITY: '활동/외출',
  EMOTION: '정서/행동',
  OTHER: '기타',
};

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const activeTab: AdminTabId =
    currentTabParam === 'organizations' || currentTabParam === 'users' || currentTabParam === 'more'
      ? currentTabParam
      : 'dashboard';

  // 기본 데이터
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<PaginatedAdminUsers | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);

  // 당사자 고유 코드 상태
  const [recipients, setRecipients] = useState<AdminCareRecipient[] | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientBirthDate, setRecipientBirthDate] = useState('');
  const [recipientGender, setRecipientGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [recipientDisabilityTypes, setRecipientDisabilityTypes] = useState<
    ('INTELLECTUAL' | 'AUTISM' | 'OTHER')[]
  >([]);
  const [recipientDisabilityGrade, setRecipientDisabilityGrade] = useState('');
  const [recipientOtherDisabilityType, setRecipientOtherDisabilityType] = useState('');
  const [isCreatingRecipient, setIsCreatingRecipient] = useState(false);
  const [recipientMessage, setRecipientMessage] = useState<string | null>(null);
  const [recipientCreatedCode, setRecipientCreatedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 필터 및 페이징
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 신규 기관 등록 상태
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createdOrgBanner, setCreatedOrgBanner] = useState<{ name: string; code: string } | null>(null);
  const [orgFormError, setOrgFormError] = useState<string | null>(null);

  // 기관 수정 모달 상태
  const [editingOrg, setEditingOrg] = useState<AdminOrganization | null>(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [isSubmittingOrgEdit, setIsSubmittingOrgEdit] = useState(false);

  // 신규 사용자 등록 모달 상태
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPPORT_WORKER',
    phone: '',
    organizationId: '',
  });
  const [isSubmittingUserCreate, setIsSubmittingUserCreate] = useState(false);
  const [userModalError, setUserModalError] = useState<string | null>(null);

  // 사용자 수정 모달 상태
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'SUPPORT_WORKER',
    phone: '',
    organizationId: '',
  });
  const [isSubmittingUserEdit, setIsSubmittingUserEdit] = useState(false);

  // 기록 조회 모달 상태
  const [viewingRecordsTarget, setViewingRecordsTarget] = useState<{
    type: 'user' | 'org';
    id: number;
    title: string;
  } | null>(null);
  const [recordsList, setRecordsList] = useState<AdminRecordSummary[] | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // ConfirmDialog state
  const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<AdminOrganization | null>(null);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);
  const [orgEditError, setOrgEditError] = useState<string | null>(null);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUserSummary | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [userEditError, setUserEditError] = useState<string | null>(null);
  const [selfDeleteError, setSelfDeleteError] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    void fetchStats();
    void fetchOrganizations();
    void fetchRecipients();
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [roleFilter, orgFilter, page]);

  const handleTabChange = (tab: AdminTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'dashboard') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      },
      { replace: true }
    );
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest<Stats>('/api/admin/stats');
      setStats(data);
    } catch {
      setError('통계를 불러오지 못했어요.');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const data = await getAdminOrganizations();
      setOrganizations(data);
    } catch {
      // 기관 목록 조회 오류
    }
  };

  const fetchRecipients = async (searchQuery?: string) => {
    setLoadingRecipients(true);
    try {
      const data = await getAdminCareRecipients(searchQuery);
      setRecipients(data);
    } catch {
      // 당사자 목록 오류 처리
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCreateRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientBirthDate || isCreatingRecipient) return;
    setIsCreatingRecipient(true);
    setRecipientMessage(null);
    setRecipientCreatedCode(null);

    const grade = recipientDisabilityGrade.trim() ? Number(recipientDisabilityGrade) : null;
    try {
      const created = await createAdminCareRecipient({
        name: recipientName.trim(),
        birthDate: recipientBirthDate,
        gender: recipientGender,
        disabilityTypes: recipientDisabilityTypes,
        disabilityGrade: grade,
        otherDisabilityType: recipientDisabilityTypes.includes('OTHER')
          ? recipientOtherDisabilityType.trim()
          : null,
      });

      setRecipientName('');
      setRecipientBirthDate('');
      setRecipientDisabilityTypes([]);
      setRecipientDisabilityGrade('');
      setRecipientOtherDisabilityType('');
      setRecipientCreatedCode(created.careRecipientNumber);
      setRecipientMessage(`'${created.name}' 당사자 고유 코드 발급 완료`);
      await Promise.all([fetchRecipients(recipientSearch), fetchStats()]);
    } catch (err) {
      setRecipientMessage(err instanceof Error ? err.message : '당사자 코드 발급에 실패했어요.');
    } finally {
      setIsCreatingRecipient(false);
    }
  };

  const toggleDisabilityType = (type: 'INTELLECTUAL' | 'AUTISM' | 'OTHER') => {
    setRecipientDisabilityTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // 복사 실패 무시
    }
  };

  const handleSearchRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchRecipients(recipientSearch);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers({
        role: roleFilter || undefined,
        organizationId: orgFilter ? Number(orgFilter) : undefined,
        page,
        size: 20,
      });
      setUsers(data);
    } catch {
      setError('사용자 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  // 1. 신규 기관 등록
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || isCreatingOrg) return;
    setIsCreatingOrg(true);
    setOrgFormError(null);
    setCreatedOrgBanner(null);
    try {
      const created = await createAdminOrganization({ name: newOrgName.trim() });
      setNewOrgName('');
      setCreatedOrgBanner({ name: created.name, code: created.organizationCode });
      await Promise.all([fetchOrganizations(), fetchStats()]);
    } catch (err) {
      setOrgFormError(err instanceof Error ? err.message : '기관 등록에 실패했어요.');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // 2. 기관 수정
  const handleOpenEditOrg = (org: AdminOrganization) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
  };

  const handleSaveEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg || !editOrgName.trim() || isSubmittingOrgEdit) return;
    setIsSubmittingOrgEdit(true);
    try {
      await updateAdminOrganization(editingOrg.id, { name: editOrgName.trim() });
      setEditingOrg(null);
      await fetchOrganizations();
    } catch (err) {
      setOrgEditError(err instanceof Error ? err.message : '기관 수정에 실패했습니다.');
    } finally {
      setIsSubmittingOrgEdit(false);
    }
  };

  // 3. 기관 삭제
  const handleDeleteOrg = (org: AdminOrganization) => {
    setDeleteOrgError(null);
    setDeleteOrgTarget(org);
    setShowDeleteOrgDialog(true);
  };

  const handleDeleteOrgConfirm = async () => {
    if (!deleteOrgTarget) return;
    setShowDeleteOrgDialog(false);
    setDeleteOrgError(null);
    try {
      await deleteAdminOrganization(deleteOrgTarget.id);
      await Promise.all([fetchOrganizations(), fetchStats(), fetchUsers()]);
    } catch (err) {
      setDeleteOrgError(err instanceof Error ? err.message : '기관 삭제에 실패했습니다.');
    } finally {
      setDeleteOrgTarget(null);
    }
  };

  // 4. 기관 기록 조회
  const handleViewOrgRecords = async (org: AdminOrganization) => {
    setViewingRecordsTarget({ type: 'org', id: org.id, title: `${org.name} 기관 생활기록` });
    setRecordsLoading(true);
    try {
      const records = await getAdminOrganizationRecords(org.id);
      setRecordsList(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록을 불러오지 못했습니다.');
    } finally {
      setRecordsLoading(false);
    }
  };

  // 5. 신규 사용자 등록
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingUserCreate) return;
    setUserModalError(null);
    setIsSubmittingUserCreate(true);
    try {
      await createAdminUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        role: newUserForm.role,
        phone: newUserForm.phone.trim() || undefined,
        organizationId: newUserForm.organizationId ? Number(newUserForm.organizationId) : undefined,
      });
      setShowCreateUserModal(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'SUPPORT_WORKER',
        phone: '',
        organizationId: '',
      });
      await Promise.all([fetchUsers(), fetchStats(), fetchOrganizations()]);
    } catch (err) {
      setUserModalError(err instanceof Error ? err.message : '사용자 생성에 실패했습니다.');
    } finally {
      setIsSubmittingUserCreate(false);
    }
  };

  // 6. 사용자 정보 수정
  const handleOpenEditUser = (u: AdminUserSummary) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? '',
      organizationId: u.organizationId ? String(u.organizationId) : '',
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSubmittingUserEdit) return;
    setIsSubmittingUserEdit(true);
    try {
      await updateAdminUser(editingUser.id, {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim(),
        role: editUserForm.role,
        phone: editUserForm.phone.trim() || undefined,
        organizationId: editUserForm.organizationId ? Number(editUserForm.organizationId) : undefined,
      });
      setEditingUser(null);
      await Promise.all([fetchUsers(), fetchStats(), fetchOrganizations()]);
    } catch (err) {
      setUserEditError(err instanceof Error ? err.message : '사용자 수정에 실패했습니다.');
    } finally {
      setIsSubmittingUserEdit(false);
    }
  };

  // 7. 사용자 삭제
  const handleDeleteUser = (u: AdminUserSummary) => {
    setSelfDeleteError(null);
    setDeleteUserError(null);
    if (user?.id === u.id) {
      setSelfDeleteError('현재 로그인된 관리자 본인 계정은 삭제할 수 없습니다.');
      return;
    }
    setDeleteUserTarget(u);
    setShowDeleteUserDialog(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteUserTarget) return;
    setShowDeleteUserDialog(false);
    setDeleteUserError(null);
    try {
      await deleteAdminUser(deleteUserTarget.id);
      await Promise.all([fetchUsers(), fetchStats(), fetchOrganizations()]);
    } catch (err) {
      setDeleteUserError(err instanceof Error ? err.message : '사용자 삭제에 실패했습니다.');
    } finally {
      setDeleteUserTarget(null);
    }
  };

  // 8. 사용자 기록 조회
  const handleViewUserRecords = async (u: AdminUserSummary) => {
    setViewingRecordsTarget({ type: 'user', id: u.id, title: `${u.name} 님의 작성 생활기록` });
    setRecordsLoading(true);
    try {
      const records = await getAdminUserRecords(u.id);
      setRecordsList(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록을 불러오지 못했습니다.');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutDialog(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return `${styles.roleBadge} ${styles.roleBadgeAdmin}`;
      case 'INSTITUTION':
        return `${styles.roleBadge} ${styles.roleBadgeInstitution}`;
      case 'SUPPORT_WORKER':
        return `${styles.roleBadge} ${styles.roleBadgeWorker}`;
      case 'GUARDIAN':
      default:
        return `${styles.roleBadge} ${styles.roleBadgeGuardian}`;
    }
  };

  return (
    <AppShell
      role={user?.role}
      footer={
        <AdminTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          orgCount={organizations?.length}
          userCount={users?.pagination.totalItems}
        />
      }
    >
      <main className="demo-page">
        {/* 상단 관리자 프로필 카드 */}
        <section className={styles.headerCard}>
          <div className={styles.profileInfo}>
            <p className="eyebrow" style={{ margin: 0 }}>슈퍼 어드민</p>
            <h1 className={styles.adminTitle}>{user?.name ?? '관리자'}님</h1>
            <p className={styles.adminSubtitle}>{user?.email}</p>
          </div>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => { void handleLogout(); }}
          >
            로그아웃
          </button>
        </section>

        {error && <div className={styles.errorBanner} role="alert">{error}</div>}

        {/* 1. 대시보드 탭 */}
        {activeTab === 'dashboard' && (
          <>
            <section aria-label="서비스 통계">
              <div className={styles.sectionHeading}>
                <h2 className={styles.sectionTitle}>서비스 통계</h2>
              </div>
              {stats ? (
                <div className={styles.statsGrid}>
                  <div className={`${styles.statCard} ${styles.highlight}`}>
                    <p className={styles.statLabel}>전체 사용자</p>
                    <p className={styles.statValue}>{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className={`${styles.statCard} ${styles.highlight}`}>
                    <p className={styles.statLabel}>돌봄 대상자</p>
                    <p className={styles.statValue}>{stats.totalCareRecipients.toLocaleString()}</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>보호자</p>
                    <p className={styles.statValue}>{stats.guardians.toLocaleString()}</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>활동지원사</p>
                    <p className={styles.statValue}>{stats.supportWorkers.toLocaleString()}</p>
                  </div>
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>등록 기관</p>
                    <p className={styles.statValue}>{stats.totalOrganizations.toLocaleString()}</p>
                  </div>
                  <div className={`${styles.statCard} ${styles.highlight}`}>
                    <p className={styles.statLabel}>총 생활기록</p>
                    <p className={styles.statValue}>{stats.totalRecords.toLocaleString()}건</p>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyBox}>통계를 불러오는 중…</div>
              )}
            </section>

            {/* 당사자 고유 코드 발급 및 관리 */}
            <section style={{ marginTop: 24 }} aria-label="당사자 고유 코드 관리">
              <div className={styles.sectionHeading} style={{ marginBottom: 12 }}>
                <h2 className={styles.sectionTitle}>
                  당사자 고유 코드 관리 {recipients ? `(${recipients.length})` : ''}
                </h2>
              </div>

              {/* 신규 당사자 등록 및 고유 코드 발급 폼 */}
              <div className="demo-card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '15px', margin: '0 0 10px', color: 'var(--ink)' }}>
                  신규 당사자 등록 및 고유 코드 발급
                </h3>
                <form className="demo-form" onSubmit={(e) => { void handleCreateRecipient(e); }}>
                  <label>
                    당사자 이름
                    <input
                      type="text"
                      aria-label="신규 당사자 이름"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="예: 홍길동"
                      required
                      maxLength={50}
                    />
                  </label>

                  <label>
                    생년월일
                    <input
                      type="date"
                      aria-label="당사자 생년월일"
                      value={recipientBirthDate}
                      onChange={(e) => setRecipientBirthDate(e.target.value)}
                      required
                    />
                  </label>

                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>성별</span>
                    <div className={styles.genderGroup}>
                      <label className={styles.genderLabel}>
                        <input
                          type="radio"
                          name="recipientGender"
                          value="MALE"
                          checked={recipientGender === 'MALE'}
                          onChange={() => setRecipientGender('MALE')}
                        />
                        남성
                      </label>
                      <label className={styles.genderLabel}>
                        <input
                          type="radio"
                          name="recipientGender"
                          value="FEMALE"
                          checked={recipientGender === 'FEMALE'}
                          onChange={() => setRecipientGender('FEMALE')}
                        />
                        여성
                      </label>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      장애 유형 <span className="muted" style={{ fontWeight: 400 }}>(선택)</span>
                    </span>
                    <div className={styles.checkboxGroup}>
                      {(['INTELLECTUAL', 'AUTISM', 'OTHER'] as const).map((type) => (
                        <label key={type} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={recipientDisabilityTypes.includes(type)}
                            onChange={() => toggleDisabilityType(type)}
                          />
                          {DISABILITY_LABELS[type]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {recipientDisabilityTypes.includes('OTHER') && (
                    <label>
                      기타 장애 유형
                      <input
                        type="text"
                        value={recipientOtherDisabilityType}
                        onChange={(e) => setRecipientOtherDisabilityType(e.target.value)}
                        placeholder="예: 뇌병변 장애"
                        maxLength={100}
                      />
                    </label>
                  )}

                  <label>
                    장애 정도 <span className="muted" style={{ fontWeight: 400 }}>(선택, 숫자)</span>
                    <input
                      type="number"
                      value={recipientDisabilityGrade}
                      onChange={(e) => setRecipientDisabilityGrade(e.target.value)}
                      placeholder="예: 1 또는 2"
                      min={1}
                      max={6}
                    />
                  </label>

                  {recipientMessage && (
                    <div style={{ margin: '4px 0 0' }}>
                      <p className="hint" role="status" style={{ margin: 0, color: 'var(--green)', fontWeight: 600 }}>
                        {recipientMessage}
                      </p>
                      {recipientCreatedCode && (
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '13px', color: 'var(--ink)' }}>발급된 코드:</span>
                          <span className={styles.userCode} style={{ fontWeight: 700, color: 'var(--green)' }}>
                            {recipientCreatedCode}
                          </span>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => { void handleCopy(recipientCreatedCode); }}
                          >
                            {copiedCode === recipientCreatedCode ? '복사됨!' : '코드 복사'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="btn"
                    type="submit"
                    disabled={!recipientName.trim() || !recipientBirthDate || isCreatingRecipient}
                  >
                    {isCreatingRecipient ? '발급 중…' : '당사자 고유 코드 발급'}
                  </button>
                </form>
              </div>

              {/* 당사자 검색 폼 */}
              <form
                onSubmit={handleSearchRecipient}
                style={{ display: 'flex', gap: 8, marginBottom: 12 }}
              >
                <input
                  type="text"
                  aria-label="당사자 검색"
                  className={styles.searchInput}
                  placeholder="이름 또는 고유 코드 검색"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn secondary"
                  style={{ padding: '6px 14px', minHeight: 'unset', fontSize: '13px' }}
                >
                  검색
                </button>
              </form>

              {/* 당사자 목록 */}
              {loadingRecipients ? (
                <div className={styles.emptyBox}>당사자 목록을 불러오는 중…</div>
              ) : !recipients || recipients.length === 0 ? (
                <div className={styles.emptyBox}>등록된 당사자가 없어요.</div>
              ) : (
                <div className={styles.userList}>
                  {recipients.map((r) => (
                    <div key={r.id} className={styles.userCard}>
                      <div className={styles.userCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={styles.userName}>{r.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            ({r.gender === 'MALE' ? '남' : '여'}, {r.birthDate})
                          </span>
                        </div>
                        {r.guardianName ? (
                          <span className={styles.statusBadgeLinked}>
                            보호자: {r.guardianName}
                          </span>
                        ) : (
                          <span className={styles.statusBadgeUnlinked}>
                            미연결 (발급 완료)
                          </span>
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.cardMetaList}>
                          <div className={styles.codeRow}>
                            <span>고유 코드</span>
                            <span className={styles.userCode}>{r.careRecipientNumber}</span>
                            <button
                              type="button"
                              className={styles.copyButton}
                              onClick={() => { void handleCopy(r.careRecipientNumber); }}
                              aria-label={`${r.name} 고유 코드 복사`}
                            >
                              {copiedCode === r.careRecipientNumber ? '복사됨!' : '코드 복사'}
                            </button>
                          </div>
                          <div className={styles.subMetaRow}>
                            {r.organizationName ? (
                              <span>
                                연결 기관: <strong className={styles.metaHighlight}>{r.organizationName}</strong>
                              </span>
                            ) : (
                              <span>연결 기관: <span style={{ color: 'var(--muted)' }}>미연결</span></span>
                            )}
                            <span>·</span>
                            <span>{new Date(r.createdAt).toLocaleDateString('ko-KR')} 등록</span>
                          </div>
                        </div>
                        {r.disabilityTypes && r.disabilityTypes.length > 0 && (
                          <div className={styles.tagList}>
                            {r.disabilityTypes.map((dt) => (
                              <span key={dt} className={styles.tag}>
                                {DISABILITY_LABELS[dt] ?? dt}
                                {dt === 'OTHER' && r.otherDisabilityType ? `(${r.otherDisabilityType})` : ''}
                              </span>
                            ))}
                            {r.disabilityGrade && (
                              <span className={styles.tag}>{r.disabilityGrade}급(정도)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* 2. 기관 관리 탭 */}
        {activeTab === 'organizations' && (
          <section aria-label="기관 관리">
            <div className={styles.sectionHeading} style={{ marginBottom: 12 }}>
              <h2 className={styles.sectionTitle}>
                기관 관리 {organizations ? `(${organizations.length})` : ''}
              </h2>
            </div>

            {/* 신규 기관 생성 폼 */}
            <div className="demo-card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '15px', margin: '0 0 10px', color: 'var(--ink)' }}>신규 기관 등록 및 코드 발급</h3>
              <form className="demo-form" onSubmit={(e) => { void handleCreateOrg(e); }}>
                <label>
                  신규 기관 이름
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="예: 희망 복지관"
                    required
                    maxLength={100}
                  />
                </label>
                {orgFormError && (
                  <p className="error" role="alert" style={{ margin: '4px 0 0' }}>{orgFormError}</p>
                )}
                <button className="btn" type="submit" disabled={!newOrgName.trim() || isCreatingOrg}>
                  {isCreatingOrg ? '발급 중…' : '기관 코드 발급'}
                </button>
              </form>
            </div>

            {/* 신규 발급 성공 배너 */}
            {createdOrgBanner && (
              <div className={styles.successBanner} role="status" style={{ marginBottom: 16 }}>
                <div>
                  <strong>'{createdOrgBanner.name}'</strong> 기관이 성공적으로 등록되었습니다.
                  <div style={{ marginTop: 4 }}>
                    발급 기관 코드: <code className={styles.userCode}>{createdOrgBanner.code}</code>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.codeCopyBtn}
                  onClick={() => {
                    void navigator.clipboard.writeText(createdOrgBanner.code);
                  }}
                >
                  코드 복사
                </button>
              </div>
            )}

            {/* 기관 목록 */}
            {!organizations ? (
              <div className={styles.emptyBox}>기관 목록을 불러오는 중…</div>
            ) : organizations.length === 0 ? (
              <div className={styles.emptyBox}>등록된 기관이 없어요.</div>
            ) : (
              <div className={styles.userList}>
                {organizations.map((org) => (
                  <div key={org.id} className={styles.userCard}>
                    <div className={styles.userCardHeader}>
                      <span className={styles.userName}>{org.name}</span>
                      <span className={`${styles.roleBadge} ${org.ownerName ? styles.roleBadgeInstitution : ''}`}>
                        {org.ownerName ? `${org.ownerName} 담당` : '담당자 미등록'}
                      </span>
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userMeta}>
                        <span>기관 코드 <span className={styles.userCode}>{org.organizationCode}</span></span>
                        <span>·</span>
                        <span>{new Date(org.createdAt).toLocaleDateString('ko-KR')} 등록</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                        onClick={() => { void handleViewOrgRecords(org); }}
                      >
                        기록 조회
                      </button>
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handleOpenEditOrg(org)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionDanger}`}
                        onClick={() => { handleDeleteOrg(org); }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. 사용자 목록 탭 */}
        {activeTab === 'users' && (
          <section aria-label="사용자 목록">
            <div className={styles.sectionHeading} style={{ marginBottom: 12 }}>
              <h2 className={styles.sectionTitle}>
                사용자 목록 {users ? `(${users.pagination.totalItems})` : ''}
              </h2>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  setUserModalError(null);
                  setShowCreateUserModal(true);
                }}
              >
                + 신규 사용자 등록
              </button>
            </div>

            {/* 필터 행 (역할 필터 + 기관 필터) */}
            <div className={styles.filterRow} style={{ marginBottom: 14 }}>
              <select
                className={styles.filterSelect}
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="역할 필터"
              >
                <option value="">전체 역할</option>
                <option value="GUARDIAN">보호자</option>
                <option value="SUPPORT_WORKER">활동지원사</option>
                <option value="INSTITUTION">기관</option>
                <option value="ADMIN">관리자</option>
              </select>

              <select
                className={styles.filterSelect}
                value={orgFilter}
                onChange={(e) => {
                  setOrgFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="기관 필터"
              >
                <option value="">전체 기관</option>
                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className={styles.emptyBox}>사용자 목록을 불러오는 중…</div>
            ) : !users || users.items.length === 0 ? (
              <div className={styles.emptyBox}>등록된 사용자가 없어요.</div>
            ) : (
              <div className={styles.userList}>
                {users.items.map((u) => (
                  <div key={u.id} className={styles.userCard}>
                    <div className={styles.userCardHeader}>
                      <span className={styles.userName}>{u.name}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {u.organizationName && (
                          <span className={styles.orgBadge}>{u.organizationName}</span>
                        )}
                        <span className={getRoleBadgeClass(u.role)}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </div>
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.userEmail}>{u.email}</span>
                      <div className={styles.cardMetaList}>
                        <div className={styles.codeRow}>
                          <span>식별 코드</span>
                          <span className={styles.userCode}>{u.publicCode}</span>
                        </div>
                        <div className={styles.subMetaRow}>
                          {u.role === 'SUPPORT_WORKER' && !u.organizationName && <span>미소속 ·</span>}
                          {u.role === 'GUARDIAN' && !u.organizationName && <span>미연결 ·</span>}
                          {u.phone && <span>{u.phone} ·</span>}
                          <span>{new Date(u.createdAt).toLocaleDateString('ko-KR')} 가입</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                        onClick={() => { void handleViewUserRecords(u); }}
                      >
                        기록 조회
                      </button>
                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handleOpenEditUser(u)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionDanger}`}
                        onClick={() => { handleDeleteUser(u); }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {users && users.pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  이전
                </button>
                <span className={styles.pageInfo}>
                  {page} / {users.pagination.totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={page >= users.pagination.totalPages}
                  onClick={() => setPage((p) => p - 1)}
                >
                  다음
                </button>
              </div>
            )}
          </section>
        )}

        {/* 4. 더보기 탭 */}
        {activeTab === 'more' && (
          <section className={styles.moreSection} aria-label="더보기">
            <div className={styles.sectionHeading}>
              <h2 className={styles.sectionTitle}>더보기</h2>
            </div>

            <div className={styles.menuCard}>
              <p className={styles.menuCardTitle}>관리자 계정 정보</p>
              <div className={styles.menuItemRow}>
                <span>이름</span>
                <strong>{user?.name}</strong>
              </div>
              <div className={styles.menuItemRow}>
                <span>이메일</span>
                <span>{user?.email}</span>
              </div>
              <div className={styles.menuItemRow}>
                <span>권한</span>
                <span className={`${styles.roleBadge} ${styles.roleBadgeAdmin}`}>슈퍼 어드민</span>
              </div>
            </div>

            <div className={styles.menuCard}>
              <p className={styles.menuCardTitle}>시스템 및 플랫폼 현황</p>
              <div className={styles.menuItemRow}>
                <span>플랫폼 버전</span>
                <strong>v1.0.0</strong>
              </div>
              <div className={styles.menuItemRow}>
                <span>API 서버 상태</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>정상 동작 중</span>
              </div>
              <div className={styles.menuItemRow}>
                <span>등록된 기관</span>
                <span>{organizations?.length ?? 0}개</span>
              </div>
              <div className={styles.menuItemRow}>
                <span>총 회원 수</span>
                <span>{stats?.totalUsers ?? 0}명</span>
              </div>
            </div>

            <div className={styles.menuCard}>
              <p className={styles.menuCardTitle}>안내 및 정책</p>
              <div className={styles.menuItemRow}>
                <span>서비스 이용약관</span>
                <span style={{ color: 'var(--muted)' }}>v1.0</span>
              </div>
              <div className={styles.menuItemRow}>
                <span>개인정보 처리방침</span>
                <span style={{ color: 'var(--muted)' }}>v1.0</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.logoutButton}
              style={{ width: '100%', padding: '12px', fontSize: '15px', color: '#dc2626' }}
              onClick={() => { void handleLogout(); }}
            >
              로그아웃
            </button>
          </section>
        )}
      </main>

      {/* 모달 1: 기관명 수정 모달 */}
      {editingOrg && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-org-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="edit-org-title" className={styles.modalTitle}>기관 정보 수정</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingOrg(null)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { void handleSaveEditOrg(e); }}>
              <div className={styles.modalBody}>
                <label className="demo-form">
                  기관 이름
                  <input
                    type="text"
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </label>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  기관 코드: <strong>{editingOrg.organizationCode}</strong> (수정 불가)
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ flex: 1 }}
                    onClick={() => setEditingOrg(null)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ flex: 1 }}
                    disabled={!editOrgName.trim() || isSubmittingOrgEdit}
                  >
                    {isSubmittingOrgEdit ? '저장 중…' : '변경사항 저장'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 2: 신규 사용자 등록 모달 */}
      {showCreateUserModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="create-user-title" className={styles.modalTitle}>신규 사용자 등록</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowCreateUserModal(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { void handleCreateUser(e); }}>
              <div className={styles.modalBody}>
                {userModalError && <p className="error" role="alert">{userModalError}</p>}
                <label className="demo-form">
                  이름
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder="홍길동"
                    required
                  />
                </label>
                <label className="demo-form">
                  이메일
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </label>
                <label className="demo-form">
                  초기 비밀번호 (6자 이상)
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                    required
                  />
                </label>
                <label className="demo-form">
                  역할
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  >
                    <option value="GUARDIAN">보호자</option>
                    <option value="SUPPORT_WORKER">활동지원사</option>
                    <option value="INSTITUTION">기관</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                </label>
                <label className="demo-form">
                  전화번호 (선택)
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="010-0000-0000"
                  />
                </label>
                {(newUserForm.role === 'SUPPORT_WORKER' || newUserForm.role === 'INSTITUTION') && (
                  <label className="demo-form">
                    소속 기관 (선택)
                    <select
                      value={newUserForm.organizationId}
                      onChange={(e) => setNewUserForm({ ...newUserForm, organizationId: e.target.value })}
                    >
                      <option value="">소속 기관 없음</option>
                      {organizations?.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.organizationCode})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowCreateUserModal(false)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ flex: 1 }}
                    disabled={isSubmittingUserCreate}
                  >
                    {isSubmittingUserCreate ? '등록 중…' : '사용자 등록'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 3: 사용자 정보 수정 모달 */}
      {editingUser && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="edit-user-title" className={styles.modalTitle}>사용자 정보 수정</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingUser(null)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { void handleSaveEditUser(e); }}>
              <div className={styles.modalBody}>
                <label className="demo-form">
                  이름
                  <input
                    type="text"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="demo-form">
                  이메일
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    required
                  />
                </label>
                <label className="demo-form">
                  역할
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  >
                    <option value="GUARDIAN">보호자</option>
                    <option value="SUPPORT_WORKER">활동지원사</option>
                    <option value="INSTITUTION">기관</option>
                    <option value="ADMIN">관리자</option>
                  </select>
                </label>
                <label className="demo-form">
                  전화번호
                  <input
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  />
                </label>
                <label className="demo-form">
                  소속 기관
                  <select
                    value={editUserForm.organizationId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, organizationId: e.target.value })}
                  >
                    <option value="">소속 없음</option>
                    {organizations?.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ flex: 1 }}
                    onClick={() => setEditingUser(null)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ flex: 1 }}
                    disabled={isSubmittingUserEdit}
                  >
                    {isSubmittingUserEdit ? '저장 중…' : '변경사항 저장'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 4: 기록 조회 모달 */}
      {viewingRecordsTarget && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="records-modal-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="records-modal-title" className={styles.modalTitle}>
                {viewingRecordsTarget.title}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setViewingRecordsTarget(null);
                  setRecordsList(null);
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {recordsLoading ? (
                <div className={styles.emptyBox}>기록을 불러오는 중…</div>
              ) : !recordsList || recordsList.length === 0 ? (
                <div className={styles.emptyBox}>등록된 생활기록이 없습니다.</div>
              ) : (
                <div className={styles.recordList}>
                  {recordsList.map((rec) => (
                    <article key={rec.id} className={styles.recordCard}>
                      <div className={styles.recordMeta}>
                        <span className={styles.recordCategory}>
                          {RECORD_CATEGORY_LABELS[rec.category] ?? rec.category}
                        </span>
                        <span>{new Date(rec.recordedAt).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className={styles.recordContent}>{rec.content}</p>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: 8 }}>
                        {rec.careRecipientName && <span>당사자: {rec.careRecipientName}</span>}
                        {rec.authorName && <span>작성자: {rec.authorName}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {orgEditError && <p role="alert" className={styles.errorBanner}>{orgEditError}</p>}
      {deleteOrgError && <p role="alert" className={styles.errorBanner}>{deleteOrgError}</p>}
      {userEditError && <p role="alert" className={styles.errorBanner}>{userEditError}</p>}
      {selfDeleteError && <p role="alert" className={styles.errorBanner}>{selfDeleteError}</p>}
      {deleteUserError && <p role="alert" className={styles.errorBanner}>{deleteUserError}</p>}

      <ConfirmDialog
        open={showDeleteOrgDialog}
        title={`'${deleteOrgTarget?.name}' 기관을 정말 삭제하시겠습니까?`}
        description="소속 멤버 및 당사자 연결 데이터가 함께 정리됩니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => { void handleDeleteOrgConfirm(); }}
        onCancel={() => { setShowDeleteOrgDialog(false); setDeleteOrgTarget(null); }}
      />
      <ConfirmDialog
        open={showDeleteUserDialog}
        title={`'${deleteUserTarget?.name}' 사용자를 정말 삭제할까요?`}
        description={deleteUserTarget ? `${deleteUserTarget.email}` : undefined}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => { void handleDeleteUserConfirm(); }}
        onCancel={() => { setShowDeleteUserDialog(false); setDeleteUserTarget(null); }}
      />
      <ConfirmDialog
        open={showLogoutDialog}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        onConfirm={() => { void handleLogoutConfirm(); }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </AppShell>
  );
}
