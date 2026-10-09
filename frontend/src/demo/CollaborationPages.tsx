import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from './context';
import { canAccess, roles } from './model';
import { Card, Confirm, Empty, Guard, Nav, Page } from './UI';
export function RequestForm() {
  const { state, send } = useDemo();
  const [params] = useSearchParams();
  const kind = params.get('kind') === 'behavior' ? 'behavior' : 'information';
  const [content, setContent] = useState('');
  const [done, setDone] = useState(false);
  return (
    <Guard person allowed={kind === 'behavior' ? ['agency'] : ['provider']}>
      <Page
        title={kind === 'behavior' ? '도전행동 기록 요청' : '추가 정보 요청'}
        back="/requests"
      >
        {done ? (
          <>
            <p className="success" role="status">
              요청을 보냈습니다.
            </p>
            <Nav to="/requests">요청함 보기</Nav>
          </>
        ) : (
          <>
            <Card className="accent">
              <h2>
                {state.people.find((p) => p.id === state.recipientId)?.name}님
              </h2>
              <p>
                {kind === 'behavior'
                  ? '현재 유효하게 배정된 활동지원사에게 전달됩니다.'
                  : '돌봄 보호자에게 직접 전달됩니다.'}
              </p>
            </Card>
            <form
              className="demo-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (send({ type: 'request', kind, content })) setDone(true);
              }}
            >
              <label>
                요청 내용{kind === 'behavior' ? ' (선택)' : ''}
                <textarea
                  required={kind === 'information'}
                  rows={5}
                  maxLength={1000}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <button className="btn">
                {kind === 'behavior' ? '기록 요청 보내기' : '기관에 전달'}
              </button>
            </form>
          </>
        )}
      </Page>
    </Guard>
  );
}
export function Requests() {
  const { state, send } = useDemo();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const items = state.requests.filter(
    (r) =>
      canAccess(state, r.recipientId) &&
      (state.role !== 'guardian' ||
        (r.kind === 'behavior' && r.status === 'answered') ||
        r.kind === 'information'),
  );
  return (
    <Guard>
      <Page title="요청·중계함" back="/more">
        {state.role !== 'guardian' && (
          <Nav
            to={`/requests/new?kind=${state.role === 'agency' ? 'behavior' : 'information'}`}
          >
            {state.role === 'agency' ? '도전행동 기록 요청' : '추가 정보 요청'}
          </Nav>
        )}
        {!items.length && <Empty>아직 도착한 요청이 없어요.</Empty>}
        {items.map((r) => (
          <Card key={r.id}>
            <span className="tag">
              {
                {
                  pending: '접수됨',
                  relayed: '보호자에게 전달됨',
                  answered: '답변 완료',
                }[r.status]
              }
            </span>
            <h2>
              {state.people.find((p) => p.id === r.recipientId)?.name}님 ·{' '}
              {r.kind === 'behavior' ? '기록 요청' : '추가 정보'}
            </h2>
            <p>{r.content}</p>
            {r.response && (
              <>
                <p className="muted">답변</p>
                <p>{r.response}</p>
              </>
            )}
            {((state.role === 'guardian' &&
              r.kind === 'information' &&
              r.status === 'pending') ||
              (state.role === 'provider' &&
                r.kind === 'behavior' &&
                r.status === 'pending')) && (
              <form
                className="demo-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  send({
                    type: 'respond',
                    id: r.id,
                    response: responses[r.id] ?? '',
                  });
                }}
              >
                <label>
                  답변 내용
                  <textarea
                    required
                    rows={4}
                    maxLength={1000}
                    value={responses[r.id] ?? ''}
                    onChange={(e) =>
                      setResponses({ ...responses, [r.id]: e.target.value })
                    }
                  />
                </label>
                <button className="btn">답변 전달</button>
              </form>
            )}
          </Card>
        ))}
      </Page>
    </Guard>
  );
}
export function Notifications() {
  const { state, send } = useDemo();
  const nav = useNavigate();
  const items = state.notifications.filter((n) => n.role === state.role);
  const unread = items.filter((n) => !n.read).length;
  return (
    <Guard>
      <Page title="알림함" back="/home">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="muted" style={{ margin: 0 }}>{roles[state.role]}에게 도착한 데모 알림</p>
          {unread > 0 && (
            <button
              className="btn secondary"
              style={{ fontSize: 13, padding: '6px 14px' }}
              onClick={() => send({ type: 'readAll' })}
            >
              모두 읽기
            </button>
          )}
        </div>
        {items.map((n) => (
          <Card key={n.id}>
            <span className="tag">{n.read ? '읽음' : '새 알림'}</span>
            <p>{n.text}</p>
            <button
              className="btn secondary"
              onClick={() => {
                if (send({ type: 'read', id: n.id })) nav(n.to);
              }}
            >
              내용 확인
            </button>
          </Card>
        ))}
        {!items.length && (
          <Empty>
            아직 알림이 없어요. 기록 작성이나 배정을 체험하면 알림이 표시됩니다.
          </Empty>
        )}
      </Page>
    </Guard>
  );
}
export function Secondary() {
  const { state, send } = useDemo();
  const [editing, setEditing] = useState(!state.secondary);
  const [name, setName] = useState(state.secondary?.name ?? '');
  const [contact, setContact] = useState(state.secondary?.contact ?? '');
  const [confirm, setConfirm] = useState(false);
  return (
    <Guard allowed={['guardian']}>
      <Page title="세컨드 보호자 관리" back="/more">
        <p className="hint">
          보호자 부재에 대비해 지정하는 사람입니다. 실제 연락·권한 이전은
          실행하지 않습니다.
        </p>
        {editing ? (
          <form
            className="demo-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (send({ type: 'secondary', value: { name, contact } }))
                setEditing(false);
            }}
          >
            <label>
              예시 이름
              <input
                required
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              예시 연락처
              <input
                required
                value={contact}
                maxLength={30}
                placeholder="010-XXXX-XXXX"
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
            <button className="btn">지정 정보 저장</button>
          </form>
        ) : state.secondary ? (
          <Card>
            <h2>{state.secondary.name}</h2>
            <p>{state.secondary.contact}</p>
            <div className="actions">
              <button
                className="btn secondary"
                onClick={() => setEditing(true)}
              >
                수정
              </button>
              <button
                className="btn secondary"
                onClick={() => setConfirm(true)}
              >
                지정 해제
              </button>
            </div>
          </Card>
        ) : (
          <Empty>
            지정된 세컨드 보호자가 없어요.
            <button className="btn" onClick={() => setEditing(true)}>
              지정하기
            </button>
          </Empty>
        )}
        {confirm && (
          <Confirm
            title="지정을 해제할까요?"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (send({ type: 'secondary', value: null })) {
                setConfirm(false);
                setName('');
                setContact('');
              }
            }}
          >
            현재 예시 지정 정보가 삭제됩니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function AccessLog() {
  const { state } = useDemo();
  return (
    <Guard allowed={['guardian']}>
      <Page title="접근·변경 이력" back="/more">
        <p className="hint">
          이 브라우저에서 체험한 열람·변경 기록입니다. 실제 서버 감사 로그가
          아닙니다.
        </p>
        {state.logs.map((l) => (
          <Card key={l.id}>
            <span className="tag">{roles[l.role]}</span>
            <p>{l.text}</p>
            <p className="muted">{l.at}</p>
          </Card>
        ))}
        {!state.logs.length && <Empty>아직 열람·변경 이력이 없어요.</Empty>}
      </Page>
    </Guard>
  );
}
