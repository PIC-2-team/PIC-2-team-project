import { useEffect, useRef, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import TabBar from '../components/TabBar/TabBar';
import { useDemo } from './context';
import { canAccess, roles, type Role } from './model';
import './demo.css';
export function DemoLayout() {
  const { state, error, clearError } = useDemo();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
    main.current?.focus();
  }, [location.pathname]); // 경로 이동 시 새 화면 시작점으로 초점을 옮긴다.
  return (
    <div className={`demo-shell ${state.largeText ? 'large-text' : ''}`}>
      <div className="demo-strip">
        <Link to="/demo">삶결 체험판</Link>
        <span>가상 데이터 · 이 브라우저에만 저장</span>
      </div>
      <header className="app-header">
        <Link to="/home" className="brand">
          삶결<span>돌봄을 잇는 기록</span>
        </Link>
        <div>
          <Link className="icon-link" to="/notifications" aria-label="알림함">
            알림{' '}
            {state.notify
              ? state.notifications.filter(
                  (n) => n.role === state.role && !n.read,
                ).length || ''
              : ''}
          </Link>
          <Link className="role-badge" to="/onboarding">
            {roles[state.role]} ↔
          </Link>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={clearError} aria-label="오류 닫기">
            닫기
          </button>
        </div>
      )}
      <main ref={main} tabIndex={-1} className="demo-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
export function Page({
  title,
  back = '/home',
  children,
  eyebrow,
}: {
  title: string;
  back?: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="demo-page">
      <div className="page-heading">
        <Link className="back" to={back} aria-label="뒤로가기">
          ←
        </Link>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`demo-card ${className}`}>{children}</section>;
}
export function Nav({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`btn ${secondary ? 'secondary' : ''}`} to={to}>
      {children}
    </Link>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
export function Guard({
  children,
  allowed,
  person = false,
}: {
  children: ReactNode;
  allowed?: Role[];
  person?: boolean;
}) {
  const { state } = useDemo();
  if (!state.signedIn) return <Navigate to="/onboarding" replace />;
  if (
    (allowed && !allowed.includes(state.role)) ||
    (person && !canAccess(state))
  )
    return (
      <Page title="접근할 수 없어요">
        <Empty>
          <p>현재 역할 또는 배정 상태로는 이 정보를 확인할 수 없어요.</p>
          <p>기관에서 배정 기간과 연결 상태를 확인해주세요.</p>
        </Empty>
        <Nav to="/onboarding">다른 역할로 체험하기</Nav>
      </Page>
    );
  return children;
}
export function Confirm({
  title,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const el = ref.current;
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onCancel} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      <div className="actions">
        <button className="btn secondary" onClick={onCancel}>
          취소
        </button>
        <button className="btn danger" onClick={onConfirm}>
          확인
        </button>
      </div>
    </dialog>
  );
}
export function NotFound() {
  return (
    <Page title="페이지를 찾을 수 없어요">
      <Empty>주소를 확인하거나 홈에서 다시 시작해주세요.</Empty>
      <Nav to="/home">홈으로 이동</Nav>
    </Page>
  );
}
