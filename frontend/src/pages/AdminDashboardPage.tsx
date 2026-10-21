import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';
import {
  getAdminOrganizations,
  createAdminOrganization,
  type AdminOrganization,
  getAdminCareRecipients,
  createAdminCareRecipient,
  type AdminCareRecipient,
} from '../api/admin';
import { AppShell } from '../components/AppShell';
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

type UserSummary = {
  id: number;
  name: string;
  email: string;
  role: string;
  publicCode: string;
  createdAt: string;
};

type PaginatedUsers = {
  items: UserSummary[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
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

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);

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

  // 사용자 목록 필터 상태
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchStats();
    void fetchOrganizations();
    void fetchRecipients();
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [roleFilter, page]);

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
      // 기관 목록 오류 필요 시 표시
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

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || isCreatingOrg) return;
    setIsCreatingOrg(true);
    setOrgMessage(null);
    try {
      const created = await createAdminOrganization({ name: newOrgName.trim() });
      setNewOrgName('');
      setOrgMessage(`'${created.name}' 기관 등록 완료 (기관 코드: ${created.organizationCode})`);
      await Promise.all([fetchOrganizations(), fetchStats()]);
    } catch (err) {
      setOrgMessage(err instanceof Error ? err.message : '기관 등록에 실패했어요.');
    } finally {
      setIsCreatingOrg(false);
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
      const params = new URLSearchParams({ page: String(page), size: '20' });
      if (roleFilter) params.set('role', roleFilter);
      const data = await apiRequest<PaginatedUsers>(`/api/admin/users?${params}`);
      setUsers(data);
    } catch {
      setError('사용자 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('로그아웃할까요?')) return;
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
    <AppShell role={user?.role}>
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

        {/* 1. 핵심 지표 통계 */}
        <section>
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
                <p className={styles.statLabel}>기관 담당자</p>
                <p className={styles.statValue}>{stats.institutions.toLocaleString()}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>등록 기관 수</p>
                <p className={styles.statValue}>{stats.totalOrganizations.toLocaleString()}</p>
              </div>
              <div className={`${styles.statCard} ${styles.highlight}`} style={{ gridColumn: 'span 2' }}>
                <p className={styles.statLabel}>총 생활기록</p>
                <p className={styles.statValue}>{stats.totalRecords.toLocaleString()}건</p>
              </div>
            </div>
          ) : (
            <div className={styles.emptyBox}>통계를 불러오는 중…</div>
          )}
        </section>

        {/* 2. 당사자 고유 코드 발급 및 관리 */}
        <section>
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
                    <div className={styles.userMeta}>
                      <span>
                        고유 코드 <span className={styles.userCode}>{r.careRecipientNumber}</span>
                      </span>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => { void handleCopy(r.careRecipientNumber); }}
                        aria-label={`${r.name} 고유 코드 복사`}
                      >
                        {copiedCode === r.careRecipientNumber ? '복사됨!' : '복사'}
                      </button>
                      {r.organizationName && (
                        <>
                          <span>·</span>
                          <span>소속: {r.organizationName}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleDateString('ko-KR')} 등록</span>
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

        {/* 3. 기관 관리 */}
        <section>
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
                  aria-label="신규 기관 이름"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="예: 희망 복지관"
                  required
                  maxLength={100}
                />
              </label>
              {orgMessage && (
                <p className="hint" role="status" style={{ margin: '4px 0 0', color: 'var(--green)', fontWeight: 600 }}>
                  {orgMessage}
                </p>
              )}
              <button className="btn" type="submit" disabled={!newOrgName.trim() || isCreatingOrg}>
                {isCreatingOrg ? '발급 중…' : '기관 코드 발급'}
              </button>
            </form>
          </div>

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
                      {org.ownerName ? `${org.ownerName}` : '미등록'}
                    </span>
                  </div>
                  <div className={styles.userDetails}>
                    <div className={styles.userMeta}>
                      <span>기관 코드 <span className={styles.userCode}>{org.organizationCode}</span></span>
                      <span>·</span>
                      <span>{new Date(org.createdAt).toLocaleDateString('ko-KR')} 등록</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. 사용자 목록 */}
        <section>
          <div className={styles.sectionHeading} style={{ marginBottom: 12 }}>
            <h2 className={styles.sectionTitle}>
              사용자 목록 {users ? `(${users.pagination.totalItems})` : ''}
            </h2>
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
                    <span className={getRoleBadgeClass(u.role)}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userEmail}>{u.email}</span>
                    <div className={styles.userMeta}>
                      <span>코드 <span className={styles.userCode}>{u.publicCode}</span></span>
                      <span>·</span>
                      <span>{new Date(u.createdAt).toLocaleDateString('ko-KR')} 가입</span>
                    </div>
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
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
