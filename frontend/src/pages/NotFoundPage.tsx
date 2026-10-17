import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

export function NotFoundPage() {
  return (
    <AppShell>
      <main className="demo-page status-page">
        <h1>페이지를 찾을 수 없어요</h1>
        <div className="empty-state">주소를 확인하거나 홈에서 다시 시작해주세요.</div>
        <Link className="btn" to="/home">홈으로</Link>
      </main>
    </AppShell>
  );
}
