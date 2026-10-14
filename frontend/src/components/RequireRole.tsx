import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/user';

export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // TODO: AGENCY 역할은 백엔드 enum 확정 후 완전 활성화
  if (user.role !== role) {
    return <Navigate to={user.role === 'AGENCY' ? '/agency' : '/home'} replace />;
  }
  return <Outlet />;
}
