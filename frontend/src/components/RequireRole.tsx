import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/user';

export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'INSTITUTION' ? '/agency' : '/home'} replace />;
  }
  return <Outlet />;
}
