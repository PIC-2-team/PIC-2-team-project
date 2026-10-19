import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/user';

export function RequireRole({ role }: { role: UserRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    const fallback = user.role === 'ADMIN' ? '/admin' : user.role === 'INSTITUTION' ? '/agency' : '/home';
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
}
