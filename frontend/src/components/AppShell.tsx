import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UserRole } from '../types/user';
import { getUnreadNotificationCount } from '../api/notifications';
import '../styles/design-system.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ROLE_LABEL = { GUARDIAN: '돌봄 보호자', SUPPORT_WORKER: '활동지원사', INSTITUTION: '기관 담당자', ADMIN: '관리자' };

export function AppShell({ children, footer, role, homeDisabled = false }: { children: ReactNode; footer?: ReactNode; role?: UserRole; homeDisabled?: boolean }) {
  const [largeText, setLargeText] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
  const isInStandaloneMode = ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone;
  const [showIOSGuide, setShowIOSGuide] = useState(
    isIOS && !isInStandaloneMode && !sessionStorage.getItem('ios-guide-dismissed')
  );

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

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!role) return;
    let mounted = true;
    getUnreadNotificationCount()
      .then(count => {
        if (mounted) setUnreadCount(count);
      })
      .catch(() => {
        // 알림 조회 실패 시 배지 표시 생략
      });
    return () => {
      mounted = false;
    };
  }, [role]);

  const homePath = role === 'ADMIN' ? '/admin' : role === 'INSTITUTION' ? '/agency' : '/home';

  return (
    <div className={`app-shell ${largeText ? 'large-text' : ''}`}>
      <header className="app-header">
        {homeDisabled ? <span className="brand">삶결</span> : <Link className="brand" to={homePath}>삶결</Link>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="text-size-button"
            aria-label="큰 글씨 모드 전환"
            aria-pressed={largeText}
            onClick={() => setLargeText(value => !value)}
          >Aa</button>
          {role && (
            <Link
              to="/notifications"
              className="text-size-button"
              aria-label="알림함"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 10px',
                textDecoration: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: '16px',
                    color: '#ffffff',
                    backgroundColor: '#ef4444',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                  aria-label={`안 읽은 알림 ${unreadCount}개`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {role && <span className="role-badge">{ROLE_LABEL[role]}</span>}
        </div>
      </header>
      <div className="app-main">{children}</div>
      {footer}
      {isOffline && (
        <div role="alert" className="offline-banner">네트워크 연결이 원활하지 않습니다.</div>
      )}
      {showInstallBanner && (
        <div className="install-banner">
          <span>삶결을 홈 화면에 추가하면 더 편리하게 사용할 수 있어요.</span>
          <button
            type="button"
            onClick={async () => {
              await deferredPromptRef.current?.prompt();
              setShowInstallBanner(false);
            }}
          >홈 화면에 추가</button>
          <button type="button" aria-label="닫기" onClick={() => setShowInstallBanner(false)}>✕</button>
        </div>
      )}
      {showIOSGuide && (
        <div className="install-banner">
          <span>Safari 하단 공유 버튼 → <strong>홈 화면에 추가</strong>를 눌러 앱으로 설치하세요.</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => {
              sessionStorage.setItem('ios-guide-dismissed', '1');
              setShowIOSGuide(false);
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}
