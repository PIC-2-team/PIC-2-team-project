import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';
import { getAdminOrganizations, createAdminOrganization, type AdminOrganization } from '../api/admin';
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

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchStats();
    void fetchOrganizations();
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
      // 기관 목록 오류는 필요 시 표시
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

        {/* 2. 기관 관리 */}
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

        {/* 3. 사용자 목록 */}
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
