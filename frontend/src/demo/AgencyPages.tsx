import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from './context';
import { today } from './model';
import { Card, Confirm, Empty, Guard, Nav, Page } from './UI';
export function AgencyHome() {
  const { state, send } = useDemo();
  const nav = useNavigate();
  const linked = state.people.filter((p) => p.linked);
  const pendingRequests = state.requests.filter((r) => r.status === 'pending').length;

  return (
    <Guard allowed={['agency']}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* 기관 헤더 */}
        <div style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid #e8ecf0' }}>
          <p style={{ fontSize: 12, color: '#8a9ab0', margin: '0 0 4px', fontWeight: 500 }}>기관 코드 DEMO01</p>
          <h1 style={{ fontSize: 20, fontWeight: 750, color: '#1a2533', margin: 0 }}>{state.agency}</h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 통계 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 12, color: '#8a9ab0', margin: '0 0 6px', fontWeight: 500 }}>담당 당사자</p>
              <p style={{ fontSize: 32, fontWeight: 750, color: '#3CAB7E', margin: 0 }}>{linked.length}<span style={{ fontSize: 14, fontWeight: 400, color: '#8a9ab0' }}>명</span></p>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 12, color: '#8a9ab0', margin: '0 0 6px', fontWeight: 500 }}>대기 요청</p>
              <p style={{ fontSize: 32, fontWeight: 750, color: pendingRequests > 0 ? '#e05555' : '#3CAB7E', margin: 0 }}>{pendingRequests}<span style={{ fontSize: 14, fontWeight: 400, color: '#8a9ab0' }}>건</span></p>
            </div>
          </div>

          {/* 배정하기 CTA */}
          <button
            className="btn"
            style={{ gap: '0.5rem' }}
            onClick={() => nav('/agency/assign')}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="1.8" />
              <line x1="10" y1="6" x2="10" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="10" x2="14" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            활동지원사 배정하기
          </button>

          {/* 담당 당사자 목록 */}
          {linked.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a2533', margin: '4px 0 0' }}>담당 당사자</h2>
              {linked.map((p) => {
                const a = state.assignments.find(
                  (a) =>
                    a.recipientId === p.id &&
                    a.active &&
                    a.start <= today() &&
                    (!a.end || a.end >= today()),
                );
                const providerName = a ? state.providers.find((x) => x.id === a.providerId)?.name : null;
                return (
                  <div key={p.id} style={{ background: 'white', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: '#3CAB7E', fontWeight: 700 }}>
                        {p.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2533', margin: '0 0 4px' }}>{p.name}님</p>
                        <p style={{ fontSize: 12, color: '#8a9ab0', margin: 0 }}>고유번호 · {p.id}</p>
                      </div>
                      {!providerName && (
                        <span style={{ background: '#fff3e8', color: '#f57c00', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>
                          ⚠ 배정 필요
                        </span>
                      )}
                    </div>

                    {providerName && (
                      <div style={{ background: '#f0f7f3', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ fontSize: 12, color: '#8a9ab0', margin: '0 0 2px' }}>담당 활동지원사</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2533', margin: 0 }}>{providerName}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn secondary"
                        style={{ flex: 1, fontSize: 13, padding: '10px' }}
                        onClick={() => { if (send({ type: 'select', id: p.id })) nav('/care-info'); }}
                      >
                        돌봄정보
                      </button>
                      <button
                        className="btn secondary"
                        style={{ flex: 1, fontSize: 13, padding: '10px' }}
                        onClick={() => { if (send({ type: 'select', id: p.id })) nav('/profile'); }}
                      >
                        프로필
                      </button>
                      <button
                        className="btn secondary"
                        style={{ flex: 1, fontSize: 13, padding: '10px' }}
                        onClick={() => nav(`/agency/assign?recipient=${p.id}`)}
                      >
                        배정 관리
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {linked.length === 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              <p style={{ color: '#8a9ab0', margin: '0 0 16px' }}>아직 연결된 당사자가 없어요.</p>
              <button className="btn secondary" onClick={() => nav('/agency/recipients')}>보호자 정보 연결하기</button>
            </div>
          )}

          {/* 하단 관리 메뉴 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn secondary" onClick={() => nav('/agency/providers')}>활동지원사 관리</button>
            <button className="btn secondary" onClick={() => nav('/agency/recipients')}>보호자·당사자 연결</button>
            <button className="btn secondary" onClick={() => nav('/requests')}>요청 중계함 {pendingRequests > 0 ? `(${pendingRequests})` : ''}</button>
          </div>
        </div>
      </div>
    </Guard>
  );
}
export function Assign() {
  const { state, send } = useDemo();
  const [params] = useSearchParams();
  const hasPresetRecipient = !!params.get('recipient');
  const [step, setStep] = useState(hasPresetRecipient ? 2 : 1);
  const [person, setPerson] = useState(params.get('recipient') ?? '');
  const [provider, setProvider] = useState('');
  const [query, setQuery] = useState('');
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState('');
  const [hasEnd, setHasEnd] = useState(false);
  const [done, setDone] = useState(false);
  const people = state.people.filter(
    (p) => p.linked && (p.name.includes(query) || p.id.includes(query)),
  );
  const providers = state.providers.filter(
    (p) => p.active && (p.name.includes(query) || p.id.includes(query)),
  );
  return (
    <Guard allowed={['agency']}>
      <Page title="활동지원사 배정" back="/agency">
        {done ? (
          <>
            <div className="success" role="status">
              배정이 완료되었습니다.
            </div>
            <Card>
              <h2>{state.people.find((p) => p.id === person)?.name}님</h2>
              <p>
                지원사: {state.providers.find((p) => p.id === provider)?.name}
              </p>
              <p>
                {start}부터 · {hasEnd ? end + '까지' : '종료일 없음'}
              </p>
              <p className="muted">보호자·활동지원사 알림함에 반영했어요.</p>
            </Card>
            <Nav to="/relations">배정 확인하기</Nav>
          </>
        ) : (
          <>
            <p className="step-label">
              {step} / 3 ·{' '}
              {['당사자 선택', '지원사 선택', '기간 설정'][step - 1]}
            </p>
            {step < 3 && (
              <>
                <label>
                  이름 또는 고유 번호 검색
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button className="btn secondary" onClick={() => setQuery('')}>
                  검색 초기화
                </button>
              </>
            )}
            {step === 1 && (
              <>
                {people.map((p) => (
                  <button
                    className="choice"
                    aria-pressed={person === p.id}
                    key={p.id}
                    onClick={() => {
                      if (person !== p.id) setProvider('');
                      setPerson(p.id);
                    }}
                  >
                    {p.name}
                    <small>{p.id}</small>
                  </button>
                ))}
                {!people.length && (
                  <Empty>
                    연결된 당사자가 없거나 검색 결과가 없습니다.
                    <Nav to="/agency/recipients">당사자 연결</Nav>
                  </Empty>
                )}
              </>
            )}
            {step === 2 && hasPresetRecipient && (
              <Card>
                <p className="muted" style={{ marginBottom: 0 }}>당사자</p>
                <p style={{ fontWeight: 700, marginBottom: 0 }}>
                  {state.people.find((p) => p.id === person)?.name}
                </p>
              </Card>
            )}
            {step === 2 && (
              <>
                {providers.map((p) => (
                  <button
                    className="choice"
                    aria-pressed={provider === p.id}
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                  >
                    {p.name}
                    <small>{p.id}</small>
                  </button>
                ))}
                {!providers.length && (
                  <Empty>
                    활동 중인 지원사가 없거나 검색 결과가 없습니다.
                    <Nav to="/agency/providers">지원사 관리</Nav>
                  </Empty>
                )}
              </>
            )}
            {step === 3 && (
              <>
                <Card>
                  <p>
                    당사자: {state.people.find((p) => p.id === person)?.name} ·{' '}
                    {person}
                  </p>
                  <p>
                    지원사:{' '}
                    {state.providers.find((p) => p.id === provider)?.name} ·{' '}
                    {provider}
                  </p>
                </Card>
                <label>
                  시작일
                  <input
                    type="date"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={hasEnd}
                    onChange={(e) => setHasEnd(e.target.checked)}
                  />
                  종료일 지정
                </label>
                {hasEnd ? (
                  <label>
                    종료일
                    <input
                      type="date"
                      required
                      min={start}
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                ) : (
                  <p className="hint">
                    종료일 없음 · 직접 종료할 때까지 유지됩니다.
                  </p>
                )}
                {hasEnd && (!end || end < start) && (
                  <p className="error" role="alert">
                    종료일은 시작일 이후로 입력해주세요.
                  </p>
                )}
                <p className="muted">
                  데모에서는 당사자당 한 명을 배정합니다. 재배정 시 기존 배정이
                  종료됩니다.
                </p>
              </>
            )}
            <div className="actions">
              {step > 1 && !(step === 2 && hasPresetRecipient) && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setStep(step - 1);
                    setQuery('');
                  }}
                >
                  이전 단계
                </button>
              )}
              {step < 3 ? (
                <button
                  className="btn"
                  disabled={step === 1 ? !person : !provider}
                  onClick={() => {
                    setStep(step + 1);
                    setQuery('');
                  }}
                >
                  다음
                </button>
              ) : (
                <button
                  className="btn"
                  disabled={!start || (hasEnd && (!end || end < start))}
                  onClick={() => {
                    if (
                      send({
                        type: 'assign',
                        recipientId: person,
                        providerId: provider,
                        start,
                        end: hasEnd ? end : '',
                      })
                    )
                      setDone(true);
                  }}
                >
                  배정하기
                </button>
              )}
            </div>
          </>
        )}
      </Page>
    </Guard>
  );
}
export function Relations() {
  const { state, send } = useDemo();
  const [ending, setEnding] = useState('');
  const [deleting, setDeleting] = useState('');
  const [editing, setEditing] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editHasEnd, setEditHasEnd] = useState(false);

  const all = state.assignments.filter(
    (a) => state.role === 'agency' || a.recipientId === state.recipientId,
  );
  const active = all.filter((a) => a.active);
  const ended = all.filter((a) => !a.active);

  const statusLabel = (a: (typeof all)[0]) =>
    a.start > today() ? '배정 예정' : a.end && a.end < today() ? '기간 만료' : '배정 중';

  const startEdit = (a: (typeof all)[0]) => {
    setEditing(a.id);
    setEditStart(a.start);
    setEditEnd(a.end);
    setEditHasEnd(!!a.end);
  };

  const AssignmentCard = ({ a }: { a: (typeof all)[0] }) => (
    <Card key={a.id}>
      <span className="tag">{a.active ? statusLabel(a) : '종료됨'}</span>
      <h2>{state.providers.find((p) => p.id === a.providerId)?.name}</h2>
      <p>당사자 · {state.people.find((p) => p.id === a.recipientId)?.name}</p>
      <p>{a.start}부터 · {a.end ? a.end + '까지' : '종료일 없음'}</p>
      {editing === a.id ? (
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (send({ type: 'editAssignment', id: a.id, start: editStart, end: editHasEnd ? editEnd : '' }))
              setEditing('');
          }}
        >
          <label>
            시작일
            <input type="date" required value={editStart} onChange={(e) => setEditStart(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={editHasEnd} onChange={(e) => setEditHasEnd(e.target.checked)} />
            종료일 지정
          </label>
          {editHasEnd && (
            <label>
              종료일
              <input type="date" required min={editStart} value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </label>
          )}
          <div className="actions">
            <button type="button" className="btn secondary" onClick={() => setEditing('')}>취소</button>
            <button className="btn">저장</button>
          </div>
        </form>
      ) : (
        <div className="actions">
          {state.role === 'agency' && (
            <>
              <button className="btn secondary" onClick={() => startEdit(a)}>수정</button>
              <button
                className="btn secondary"
                style={{ color: '#a23d38', borderColor: '#e4c0bc' }}
                onClick={() => setDeleting(a.id)}
              >
                삭제
              </button>
            </>
          )}
          {a.active && (
            <button className="btn secondary" onClick={() => setEnding(a.id)}>돌봄 종료</button>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <Guard allowed={['guardian', 'agency']}>
      <Page title="돌봄 관계 관리" back="/more">
        {state.role === 'agency' && <Nav to="/agency/assign">새 배정 추가</Nav>}
        {!active.length && <Empty>현재 배정 중인 활동지원사가 없어요.</Empty>}
        {active.map((a) => <AssignmentCard key={a.id} a={a} />)}
        {ended.length > 0 && (
          <details>
            <summary>종료된 배정 ({ended.length}건)</summary>
            {ended.map((a) => <AssignmentCard key={a.id} a={a} />)}
          </details>
        )}
        {ending && (
          <Confirm
            title="돌봄을 종료할까요?"
            onCancel={() => setEnding('')}
            onConfirm={() => { if (send({ type: 'end', id: ending })) setEnding(''); }}
          >
            종료 즉시 해당 활동지원사의 데모 정보 접근이 제한됩니다.
          </Confirm>
        )}
        {deleting && (
          <Confirm
            title="배정 기록을 삭제할까요?"
            onCancel={() => setDeleting('')}
            onConfirm={() => { if (send({ type: 'deleteAssignment', id: deleting })) setDeleting(''); }}
          >
            이 배정 기록이 완전히 삭제됩니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function Providers() {
  const { state, send } = useDemo();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [editing, setEditing] = useState('');
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [confirm, setConfirm] = useState('');

  const active = state.providers.filter((p) => p.active);
  const inactive = state.providers.filter((p) => !p.active);

  const currentAssignment = (providerId: string) => {
    const a = state.assignments.find(
      (a) => a.providerId === providerId && a.active &&
        a.start <= today() && (!a.end || a.end >= today()),
    );
    return a ? state.people.find((p) => p.id === a.recipientId)?.name : null;
  };

  const ProviderCard = ({ p }: { p: (typeof state.providers)[0] }) => {
    const assigned = currentAssignment(p.id);
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.active ? '#e8f5ee' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 700, color: p.active ? '#3CAB7E' : '#8a9ab0' }}>
            {p.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing === p.id ? null : (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2533', margin: 0 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: '#8a9ab0', margin: 0 }}>{p.contact || p.id}{assigned ? ` · ${assigned}님 담당` : ''}</p>
              </>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: p.active ? '#e8f5ee' : '#f0f0f0', color: p.active ? '#3CAB7E' : '#8a9ab0', flexShrink: 0 }}>
            {p.active ? '활동 중' : '종료'}
          </span>
        </div>
        {editing === p.id ? (
          <form className="demo-form" onSubmit={(e) => {
            e.preventDefault();
            if (send({ type: 'provider', id: p.id, name: editName, contact: editContact, active: p.active })) setEditing('');
          }}>
            <label>
              이름
              <input required maxLength={30} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label>
              연락처
              <input maxLength={30} placeholder="010-0000-0000" value={editContact} onChange={(e) => setEditContact(e.target.value)} />
            </label>
            <div className="actions">
              <button type="button" className="btn secondary" onClick={() => setEditing('')}>취소</button>
              <button className="btn">저장</button>
            </div>
          </form>
        ) : (
          <div className="actions">
            <button className="btn secondary" onClick={() => { setEditing(p.id); setEditName(p.name); setEditContact(p.contact); }}>수정</button>
            {p.active ? (
              <button className="btn secondary" style={{ color: '#a23d38', borderColor: '#e4c0bc' }} onClick={() => setConfirm(p.id)}>활동 종료</button>
            ) : (
              <button className="btn secondary" onClick={() => send({ type: 'provider', id: p.id, name: p.name, contact: p.contact, active: true })}>활동 재개</button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Guard allowed={['agency']}>
      <Page title="활동지원사 관리" back="/agency">
        {/* 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: '전체', value: state.providers.length, color: '#1a2533' },
            { label: '활동 중', value: active.length, color: '#3CAB7E' },
            { label: '종료', value: inactive.length, color: '#8a9ab0' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'white', borderRadius: 14, padding: '14px 12px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#8a9ab0', margin: '0 0 4px', fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 750, color, margin: 0, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* 지원사 추가 */}
        {adding ? (
          <Card>
            <h2 style={{ marginBottom: 0 }}>새 지원사 추가</h2>
            <form className="demo-form" onSubmit={(e) => {
              e.preventDefault();
              if (send({ type: 'provider', name: newName, contact: newContact, active: true })) { setNewName(''); setNewContact(''); setAdding(false); }
            }}>
              <label>
                이름
                <input required maxLength={30} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
              </label>
              <label>
                연락처
                <input maxLength={30} placeholder="010-0000-0000" value={newContact} onChange={(e) => setNewContact(e.target.value)} />
              </label>
              <div className="actions">
                <button type="button" className="btn secondary" onClick={() => { setAdding(false); setNewName(''); setNewContact(''); }}>취소</button>
                <button className="btn">추가</button>
              </div>
            </form>
          </Card>
        ) : (
          <button className="btn secondary" onClick={() => setAdding(true)}>+ 지원사 추가</button>
        )}

        {/* 활동 중 */}
        {active.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3CAB7E', margin: '4px 0 0', letterSpacing: '0.5px' }}>활동 중 · {active.length}명</p>
            {active.map((p) => <ProviderCard key={p.id} p={p} />)}
          </>
        )}
        {active.length === 0 && !adding && <Empty>활동 중인 지원사가 없어요.</Empty>}

        {/* 종료된 지원사 */}
        {inactive.length > 0 && (
          <details>
            <summary>활동 종료 · {inactive.length}명</summary>
            {inactive.map((p) => <ProviderCard key={p.id} p={p} />)}
          </details>
        )}

        {confirm && (
          <Confirm
            title="지원사 활동을 종료할까요?"
            onCancel={() => setConfirm('')}
            onConfirm={() => {
              const p = state.providers.find((x) => x.id === confirm)!;
              if (send({ type: 'provider', id: p.id, name: p.name, active: false })) setConfirm('');
            }}
          >
            기존 배정도 모두 종료됩니다. 재개 후에는 다시 배정해야 합니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function Recipients() {
  const { state, send } = useDemo();
  const [code, setCode] = useState('');
  const [unlink, setUnlink] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Guard allowed={['agency']}>
      <Page title="보호자·당사자 연결" back="/agency">
        <p className="hint">
          보호자 역할에서 등록한 당사자의 고유 번호로 연결하세요. 기존 예시
          번호: p1, p2
        </p>
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (send({ type: 'link', id: code.trim(), linked: true })) {
              setCode('');
              setMessage('정보 연결이 완료되었습니다.');
            }
          }}
        >
          <label>
            당사자 고유 번호
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className="btn">보호자 정보 연결</button>
        </form>
        {message && (
          <p role="status" className="success">
            {message}
          </p>
        )}
        {state.people
          .filter((p) => p.linked)
          .map((p) => (
            <Card key={p.id}>
              <h2>{p.name}</h2>
              <p className="muted">고유 번호 · {p.id}</p>
              <Nav to={`/agency/assign?recipient=${p.id}`} secondary>
                지원사 배정
              </Nav>
              <button className="btn secondary" onClick={() => setUnlink(p.id)}>
                연결 해제
              </button>
            </Card>
          ))}
        {unlink && (
          <Confirm
            title="정보 연결을 해제할까요?"
            onCancel={() => setUnlink('')}
            onConfirm={() => {
              if (send({ type: 'link', id: unlink, linked: false }))
                setUnlink('');
            }}
          >
            기관과 활동지원사는 해당 당사자의 정보를 볼 수 없게 되며 기존 배정도
            종료됩니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function Transfer() {
  const { send } = useDemo();
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Guard allowed={['guardian']}>
      <Page title="기관 이전" back="/relations">
        {done ? (
          <>
            <p className="success" role="status">
              새봄 예시 지원센터로 이전했습니다.
            </p>
            <p>
              기존 배정은 종료되었습니다. 새 기관 담당자 역할에서 당사자를
              연결하고 다시 배정해주세요.
            </p>
            <Nav to="/relations">돌봄 관계 확인</Nav>
          </>
        ) : (
          <>
            <Card>
              <h2>새 기관 코드 확인</h2>
              <p>체험 코드 NEW002 · 새봄 예시 지원센터</p>
              <p className="muted">
                데모에서는 현재 예시 기관을 변경하고 기존 연결·배정을
                해제합니다.
              </p>
            </Card>
            <label>
              새 기관 코드
              <input
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button
              className="btn"
              disabled={code !== 'NEW002'}
              onClick={() => setConfirm(true)}
            >
              기관 이전 확인
            </button>
          </>
        )}
        {confirm && (
          <Confirm
            title="기관을 이전할까요?"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (send({ type: 'transfer', code })) {
                setConfirm(false);
                setDone(true);
              }
            }}
          >
            기존 담당자의 접근이 종료됩니다. 기록은 보호자에게 보존됩니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
