import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UserRole } from '../types/user';
import '../styles/design-system.css';

const ROLE_LABEL = { GUARDIAN: '돌봄 보호자', SUPPORT_WORKER: '활동지원사', INSTITUTION: '기관 담당자', ADMIN: '관리자' };

export function AppShell({ children, footer, role, homeDisabled = false }: { children: ReactNode; footer?: ReactNode; role?: UserRole; homeDisabled?: boolean }) {
  const [largeText, setLargeText] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const homePath = role === 'ADMIN' ? '/admin' : role === 'INSTITUTION' ? '/agency' : '/home';

  return (
    <div className={`app-shell ${largeText ? 'large-text' : ''}`}>
      <header className="app-header">
        {homeDisabled ? <span className="brand">삶결</span> : <Link className="brand" to={homePath}>삶결</Link>}
        <div>
          <button
            type="button"
            className="text-size-button"
            aria-label="큰 글씨 모드 전환"
            aria-pressed={largeText}
            onClick={() => setLargeText(value => !value)}
          >Aa</button>
          {role && <span className="role-badge">{ROLE_LABEL[role]}</span>}
        </div>
      </header>
      <div className="app-main">{children}</div>
      {footer}
      {isOffline && (
        <div role="alert" className="offline-banner">네트워크 연결이 원활하지 않습니다.</div>
      )}
    </div>
  );
}
