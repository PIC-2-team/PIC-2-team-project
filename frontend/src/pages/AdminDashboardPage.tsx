import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../api/client';

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
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchStats();
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
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f6f7', color: '#1a2533' }}>
      {/* 헤더 */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e8ecf0',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-1px', color: '#3CAB7E' }}>삶결</span>
          <span style={{ fontSize: '12px', background: '#3CAB7E', color: 'white', borderRadius: '6px', padding: '3px 8px', fontWeight: 700 }}>관리자</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7a8a' }}>{user?.name ?? user?.email}</span>
          <button
            onClick={() => { void handleLogout(); }}
            style={{ fontSize: '13px', background: 'none', border: '1px solid #e8ecf0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#6b7a8a' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>관리자 대시보드</h1>

        {error && (
          <div style={{ background: '#fff0eb', color: '#91372d', padding: '14px', borderRadius: '10px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* 통계 카드 */}
        {stats && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
            {[
              { label: '전체 사용자', value: stats.totalUsers },
              { label: '보호자', value: stats.guardians },
              { label: '활동지원사', value: stats.supportWorkers },
              { label: '기관', value: stats.institutions },
              { label: '기관 수', value: stats.totalOrganizations },
              { label: '돌봄 대상자', value: stats.totalCareRecipients },
              { label: '기록 수', value: stats.totalRecords },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'white', border: '1px solid #e8ecf0', borderRadius: '14px',
                padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7a8a', fontWeight: 600 }}>{label}</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: 750, color: '#3CAB7E', lineHeight: 1.2 }}>{value.toLocaleString()}</p>
              </div>
            ))}
          </section>
        )}

        {/* 사용자 목록 */}
        <section style={{ background: 'white', border: '1px solid #e8ecf0', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>사용자 목록</h2>
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              style={{ fontSize: '14px', border: '1px solid #e8ecf0', borderRadius: '8px', padding: '6px 10px', background: 'white', color: '#1a2533', cursor: 'pointer' }}
            >
              <option value="">전체 역할</option>
              <option value="GUARDIAN">보호자</option>
              <option value="SUPPORT_WORKER">활동지원사</option>
              <option value="INSTITUTION">기관</option>
            </select>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7a8a', fontSize: '14px' }}>불러오는 중…</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f5f6f7' }}>
                    {['이름', '이메일', '역할', '코드', '가입일'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7a8a', fontSize: '12px', borderBottom: '1px solid #e8ecf0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users?.items.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f2f4' }}>
                      <td style={{ padding: '12px 16px' }}>{u.name}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7a8a' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#f0f7f3', color: '#3CAB7E', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', fontWeight: 600 }}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#6b7a8a' }}>{u.publicCode}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7a8a' }}>
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 페이지네이션 */}
              {users && users.pagination.totalPages > 1 && (
                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'center', gap: '8px', borderTop: '1px solid #e8ecf0' }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{ padding: '6px 14px', border: '1px solid #e8ecf0', borderRadius: '8px', background: 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#b0bec5' : '#1a2533', fontSize: '13px' }}
                  >
                    이전
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '13px', color: '#6b7a8a' }}>
                    {page} / {users.pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= users.pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={{ padding: '6px 14px', border: '1px solid #e8ecf0', borderRadius: '8px', background: 'white', cursor: page >= users.pagination.totalPages ? 'not-allowed' : 'pointer', color: page >= users.pagination.totalPages ? '#b0bec5' : '#1a2533', fontSize: '13px' }}
                  >
                    다음
                  </button>
                </div>
              )}

              {users?.items.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7a8a', fontSize: '14px' }}>사용자가 없어요.</div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
