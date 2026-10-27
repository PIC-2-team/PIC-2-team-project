import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RequireAuth() {
  const { token } = useAuth();
  if (!token) {
    return (
      <Navigate to="/" replace />
    );
  }
  return <Outlet />;
}
