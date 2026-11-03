import { AppShell } from './AppShell';
import { useEffect, useState } from 'react';
import { Link, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listCareRecipients } from '../api/careRecipients';

export function RequireRecipient() {
  const layout = useOutletContext<{ hasAppShell: boolean; recordVersion?: number } | undefined>();
  const { selectedRecipientId, setSelectedRecipient } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (selectedRecipientId !== null) return;
    let active = true;
    listCareRecipients()
      .then(recipients => {
        if (!active) return;
        if (recipients[0]) setSelectedRecipient(recipients[0].id);
        else setEmpty(true);
      })
      .catch(e => {
        if (active) setError(e instanceof Error ? e.message : '당사자 정보를 불러올 수 없어요.');
      });
    return () => { active = false; };
  }, [selectedRecipientId, setSelectedRecipient]);

  if (selectedRecipientId !== null) return <Outlet context={layout} />;
  const content = (
    <div className="demo-page status-page">
      {error || empty ? (
        <>
          <p className={error ? 'error' : 'empty-state'} role={error ? 'alert' : undefined}>
            {error ?? '등록된 당사자가 없어요. 홈에서 당사자 정보를 확인해 주세요.'}
          </p>
          <Link className="btn" to="/home">홈으로</Link>
        </>
      ) : <p className="empty-state" role="status">당사자 정보를 불러오는 중…</p>}
    </div>
  );
  return layout?.hasAppShell ? content : <AppShell>{content}</AppShell>;
}
