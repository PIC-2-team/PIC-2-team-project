import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  decideGuardianClaim,
  decideOrganizationLinkRequest,
  getGuardianClaims,
  getLinkRequests,
} from '../../api/organizations';
import type { ConnectionDecision } from '../../api/organizations';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { GuardianClaim, LinkRequest } from '../../types/agency';

type RequestItem =
  | { kind: 'link'; key: string; data: LinkRequest }
  | { kind: 'claim'; key: string; data: GuardianClaim };

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; items: RequestItem[] };

const LOAD_ERROR = '연결 요청을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';

function requestedAtOf(item: RequestItem): string {
  return item.data.requestedAt;
}

function toItems(links: LinkRequest[], claims: GuardianClaim[]): RequestItem[] {
  const items: RequestItem[] = [
    ...links.filter((l) => l.status === 'PENDING').map((data) => ({ kind: 'link' as const, key: `link-${data.id}`, data })),
    ...claims.map((data) => ({ kind: 'claim' as const, key: `claim-${data.id}`, data })),
  ];
  return items.sort((a, b) => requestedAtOf(b).localeCompare(requestedAtOf(a)));
}

type Fetched = { items: RequestItem[]; partial: boolean };

// 한쪽 목록이 실패해도 다른 쪽 요청은 처리할 수 있어야 하므로 둘 다 실패할 때만 오류로 본다
async function fetchItems(): Promise<Fetched> {
  const [links, claims] = await Promise.allSettled([getLinkRequests(), getGuardianClaims()]);
  if (links.status === 'rejected' && claims.status === 'rejected') throw links.reason;
  const linkList = links.status === 'fulfilled' && Array.isArray(links.value) ? links.value : [];
  const claimList = claims.status === 'fulfilled' && Array.isArray(claims.value) ? claims.value : [];
  return { items: toItems(linkList, claimList), partial: links.status === 'rejected' || claims.status === 'rejected' };
}

function dateOf(localDateTime: string): string {
  return localDateTime.slice(0, 10);
}

function errorMessageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return '이미 처리되었거나 만료된 요청이에요. 목록을 새로 불러왔어요.';
    if (error.status === 404) return '요청을 찾을 수 없어요. 목록을 새로 불러왔어요.';
    if (error.status === 403) return '이 요청을 처리할 권한이 없어요.';
  }
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

const PARTIAL_NOTICE = '일부 요청을 불러오지 못했어요. 잠시 후 다시 불러와 주세요.';
const RELOAD_FAILED_NOTICE = '처리는 완료됐지만 목록을 새로 불러오지 못했어요. 다시 불러와 주세요.';
const UNNAMED_RECIPIENT = '이름 없는 당사자';

type Props = {
  /** 수락으로 기관의 당사자·보호자 목록이 바뀌므로 상위 화면이 다시 불러오게 알린다 */
  onChanged: () => void;
};

export function ConnectionRequests({ onChanged }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [busy, setBusy] = useState<{ key: string; decision: ConnectionDecision } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RequestItem | null>(null);
  // 늦게 도착한 옛 응답이 최신 목록을 덮어쓰지 않도록 가장 마지막 요청의 응답만 반영한다
  const latest = useRef(0);
  const loaded = useRef(false);

  const apply = (result: Fetched) => {
    loaded.current = true;
    setState({ status: 'ok', items: result.items });
    if (result.partial) setNotice(PARTIAL_NOTICE);
  };

  const reload = async () => {
    const id = ++latest.current;
    try {
      const result = await fetchItems();
      if (id === latest.current) apply(result);
    } catch {
      if (id !== latest.current) return;
      // 이미 목록을 보여 주고 있다면 처리 결과를 지우지 않고 안내만 한다
      if (loaded.current) setNotice(RELOAD_FAILED_NOTICE);
      else setState({ status: 'error' });
    }
  };

  useEffect(() => {
    let active = true;
    const id = ++latest.current;
    fetchItems()
      .then((result) => { if (active && id === latest.current) apply(result); })
      .catch(() => { if (active && id === latest.current) setState({ status: 'error' }); });
    return () => { active = false; };
    // apply는 상태 설정만 하므로 마운트 때 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (item: RequestItem, decision: ConnectionDecision) => {
    if (busy) return;
    setBusy({ key: item.key, decision });
    setNotice(null);
    let succeeded = false;
    try {
      if (item.kind === 'link') {
        await decideOrganizationLinkRequest(item.data.careRecipientId, item.data.id, decision);
      } else {
        await decideGuardianClaim(item.data.id, decision);
      }
      succeeded = true;
    } catch (e) {
      setNotice(errorMessageOf(e));
    }
    if (succeeded) {
      // 갱신이 끝나기 전에도 처리한 요청이 다시 눌리지 않도록 바로 뺀다
      setState((prev) => (prev.status === 'ok' ? { status: 'ok', items: prev.items.filter((i) => i.key !== item.key) } : prev));
      // 수락만 기관의 당사자·보호자 목록을 바꾼다
      if (decision === 'accept') onChanged();
    }
    await reload();
    setBusy(null);
  };

  const count = state.status === 'ok' ? state.items.length : 0;

  return (
    <section className="demo-card" style={{ padding: '16px 14px' }} aria-labelledby="connection-requests-title">
      <h2 id="connection-requests-title" style={{ margin: 0, fontSize: '1.05rem' }}>
        연결 요청 ({count}건)
      </h2>
      <p className="muted" style={{ margin: '4px 0 12px', fontSize: '0.8rem', lineHeight: 1.45 }}>
        보호자가 기관에 연결을 요청했거나, 이관된 당사자에 새 보호자가 연결을 요청하면 여기서 처리해요.
      </p>

      {notice && (
        <p role="alert" style={{ margin: '0 0 10px', padding: '8px 10px', borderRadius: 8, background: '#fff4f4', color: '#c62828', fontSize: '0.82rem' }}>
          {notice}
        </p>
      )}

      {state.status === 'loading' && <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>불러오는 중…</p>}

      {state.status === 'error' && (
        <div>
          <p role="alert" style={{ margin: '0 0 8px', color: '#c62828', fontSize: '0.85rem' }}>{LOAD_ERROR}</p>
          <button type="button" className="btn secondary" onClick={() => { setState({ status: 'loading' }); void reload(); }}>
            다시 불러오기
          </button>
        </div>
      )}

      {state.status === 'ok' && state.items.length === 0 && (
        <div style={{ padding: '16px 14px', textAlign: 'center', background: '#fafbfc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>처리할 연결 요청이 없어요.</p>
        </div>
      )}

      {state.status === 'ok' && state.items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.items.map((item) => {
            const rowBusy = busy?.key === item.key;
            const name = item.data.careRecipientName ?? UNNAMED_RECIPIENT;
            return (
              <li key={item.key} style={{ padding: '12px 12px', borderRadius: 10, border: '1px solid var(--line, #e2ece6)', background: '#fff' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: item.kind === 'claim' ? '#e67e22' : '#1976d2' }}>
                  {item.kind === 'claim' ? '이관된 당사자 재연결' : '기관 연결 요청'}
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 2 }}>{name}</div>
                <div className="muted" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  당사자 코드 {item.data.careRecipientNumber ?? '-'}
                </div>
                <div className="muted" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {item.kind === 'claim'
                    ? `요청 보호자 ${item.data.guardianName ?? '알 수 없음'} (${item.data.guardianPublicCode ?? '-'})`
                    : `요청 보호자 ${item.data.requestedByName ?? '알 수 없음'} (${item.data.requestedByPublicCode ?? '-'})`}
                </div>
                <div className="muted" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  요청일 {dateOf(item.data.requestedAt)}
                  {item.kind === 'claim' && ` · ${dateOf(item.data.expiresAt)}까지 처리`}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1 }}
                    disabled={busy !== null}
                    onClick={() => void decide(item, 'accept')}
                  >
                    {rowBusy && busy?.decision === 'accept' ? '처리 중…' : '수락'}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ flex: 1 }}
                    disabled={busy !== null}
                    onClick={() => setRejecting(item)}
                  >
                    {rowBusy && busy?.decision === 'reject' ? '처리 중…' : '거절'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={rejecting !== null}
        title={`${rejecting?.data.careRecipientName ?? UNNAMED_RECIPIENT} 요청을 거절할까요?`}
        description={rejecting?.kind === 'claim'
          ? '거절하면 이 보호자는 당사자에 연결되지 않아요. 보호자가 다시 요청할 수 있어요.'
          : '거절하면 이 당사자는 기관에 연결되지 않아요. 보호자가 다시 요청할 수 있어요.'}
        confirmLabel="거절하기"
        variant="danger"
        onCancel={() => setRejecting(null)}
        onConfirm={() => {
          const target = rejecting;
          setRejecting(null);
          if (target) void decide(target, 'reject');
        }}
      />
    </section>
  );
}
