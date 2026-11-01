import { Navigate, useParams } from 'react-router-dom';

export function LegacyRecordDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/records?record=${id}`} replace />;
}
