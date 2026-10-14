import { useAuth } from '../../contexts/AuthContext';

export function AgencyDashboardPage() {
  const { user } = useAuth();

  return (
    <main style={{ maxWidth: 390, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        기관 대시보드
      </h1>
      {user && (
        <p style={{ color: '#8a9ab0', marginBottom: '2rem' }}>
          {user.name} 담당자님
        </p>
      )}

      {/* TODO: 활동지원사 관리 API endpoint 확정 후 연결 (API-Spec.md §후속 화면 흐름) */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          활동지원사 관리
        </h2>
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '1.25rem', color: '#8a9ab0', textAlign: 'center' }}>
          준비 중입니다
        </div>
      </section>

      {/* TODO: 배정 관리 API endpoint 확정 후 연결 */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          배정 관리
        </h2>
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '1.25rem', color: '#8a9ab0', textAlign: 'center' }}>
          준비 중입니다
        </div>
      </section>
    </main>
  );
}
