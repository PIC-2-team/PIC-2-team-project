import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from './context';
import { canAccess, today } from './model';
import { Card, Confirm, Guard, Nav, Page } from './UI';
import { AgencyHome } from './AgencyPages';

const CATEGORY_BG: Record<string, string> = {
  COMMUNICATION: '#e8f5ee',
  LIFESTYLE: '#fff3e8',
  MEAL: '#fff8e8',
  PREFERENCE: '#fdedf0',
  BEHAVIOR: '#fff8e1',
  HEALTH_MEDICATION: '#e8f0fb',
  EMERGENCY: '#fdedf0',
  ETC: '#f0f0f0',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  COMMUNICATION: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="9" cy="10" r="5.5" fill="#3CAB7E" />
      <circle cx="15" cy="13" r="5.5" fill="#2d9468" />
    </svg>
  ),
  LIFESTYLE: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 12L11 5l7 7v8H4v-8z" fill="#f57c00" />
    </svg>
  ),
  MEAL: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M7 3v6a4 4 0 008 0V3" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="11" y1="13" x2="11" y2="19" stroke="#f9a825" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  PREFERENCE: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 18s-9-5.5-9-10a5 5 0 0110 0 5 5 0 0110 0c0 4.5-9 10-11 10z" fill="#e05555" />
    </svg>
  ),
  BEHAVIOR: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 3L20 19H2L11 3z" fill="#f9a825" />
      <rect x="10" y="9" width="2" height="5" rx="1" fill="white" />
      <circle cx="11" cy="16" r="1.2" fill="white" />
    </svg>
  ),
  HEALTH_MEDICATION: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="6" rx="3" fill="#5b8dee" transform="rotate(-45 11 13)" />
      <line x1="8" y1="17" x2="17" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  EMERGENCY: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="6" y="12" width="10" height="7" rx="1.5" fill="#e05555" />
      <path d="M9 12V9a3 3 0 016 0v3" stroke="#e05555" strokeWidth="1.8" fill="none" />
    </svg>
  ),
  ETC: (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="6" cy="11" r="1.5" fill="#8a9ab0" />
      <circle cx="11" cy="11" r="1.5" fill="#8a9ab0" />
      <circle cx="16" cy="11" r="1.5" fill="#8a9ab0" />
    </svg>
  ),
};
export function Home() {
  const { state, send } = useDemo();
  const nav = useNavigate();
  if (state.role === 'agency') return <AgencyHome />;

  const guardianPeople = state.role === 'guardian' ? state.people : [];
  const people = state.people.filter((p) => canAccess(state, p.id));
  const p = people.find((p) => p.id === state.recipientId) ?? people[0];
  const todayRecords = state.records
    .filter((r) => r.recipientId === (p?.id ?? state.recipientId) && !r.deleted && r.date === today())
    .slice(0, 3);
  const displayName =
    state.role === 'provider'
      ? state.providers.find((x) => x.id === state.providerId)?.name ?? state.name
      : state.name;
  const pendingSuggestions = state.suggestions.filter((x) => x.status === 'pending').length;

  return (
    <Guard>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 1.25rem', gap: '1.25rem', minHeight: '100%' }}>
        {/* 인사 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, color: '#8a9ab0', fontWeight: 700 }}>
            ?
          </div>
          <div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a2533', margin: '0 0 0.15rem' }}>안녕하세요, {displayName}님!</p>
            <p style={{ fontSize: '0.8125rem', color: '#8a9ab0', margin: 0 }}>
              {state.role === 'provider' ? '오늘도 따뜻한 돌봄 감사해요.' : '오늘도 좋은 하루 보내세요!'}
            </p>
          </div>
        </div>

        {/* 보호자 & 빈 상태: 당사자 없음 */}
        {state.role === 'guardian' && guardianPeople.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="14" r="7" fill="#3CAB7E" opacity="0.3" />
                <circle cx="18" cy="14" r="4" fill="#3CAB7E" />
                <path d="M6 32c0-7 5.4-12 12-12s12 5 12 12" stroke="#3CAB7E" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" fill="none" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1a2533', margin: '0 0 0.5rem' }}>아직 등록된 당사자가 없어요</p>
              <p style={{ fontSize: '0.8125rem', color: '#8a9ab0', margin: 0 }}>당사자를 등록하면 돌봄 기록을 시작할 수 있어요.</p>
            </div>
            <Link
              to="/profile/new"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3CAB7E', color: 'white', borderRadius: 50, padding: '14px 28px', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> 당사자 등록하기
            </Link>
          </div>
        )}

        {/* 활동지원사 & 배정 없음 */}
        {state.role === 'provider' && !p && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="13" r="6" fill="#c0c8d4" />
                <path d="M4 30c0-7 5-11 12-11s12 4 12 11" stroke="#c0c8d4" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <p style={{ fontSize: '1rem', color: '#8a9ab0', textAlign: 'center', margin: 0 }}>현재 배정된 당사자가 없어요</p>
            <p style={{ fontSize: '0.8125rem', color: '#b0bac6', textAlign: 'center', margin: 0 }}>기관에서 배정하면 이곳에 나타나요.</p>
          </div>
        )}

        {/* 당사자 선택 (보호자, 여러 명) */}
        {state.role === 'guardian' && guardianPeople.length > 1 && (
          <label style={{ fontSize: 14, fontWeight: 650, display: 'flex', flexDirection: 'column', gap: 6 }}>
            돌봄 당사자
            <select
              value={p?.id ?? ''}
              onChange={(e) => send({ type: 'select', id: e.target.value })}
              style={{ fontSize: 15, border: '1px solid #c8dfd4', borderRadius: 10, padding: '10px 12px', background: 'white', color: '#1a2533' }}
            >
              {guardianPeople.map((x) => (
                <option key={x.id} value={x.id}>{x.name} · {x.id}</option>
              ))}
            </select>
          </label>
        )}

        {p && (
          <>
            {/* 활동지원사: 담당 당사자 카드 */}
            {state.role === 'provider' && (
              <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 12, color: '#8a9ab0', margin: '0 0 0.5rem', fontWeight: 500 }}>담당 당사자</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a2533', margin: '0 0 1rem' }}>{p.name}님</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    to="/care-info"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f7f3', color: '#3CAB7E', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                  >
                    돌봄정보
                  </Link>
                  <Link
                    to="/records"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f7f3', color: '#3CAB7E', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                  >
                    기록보기
                  </Link>
                </div>
              </div>
            )}

            {/* 오늘의 생활기록 */}
            <section style={{ background: '#f0f7f3', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2533', margin: 0 }}>오늘의 기록</h2>
                <Link to="/records" style={{ fontSize: '0.8125rem', color: '#3CAB7E', fontWeight: 500, textDecoration: 'none' }}>전체보기 ›</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {todayRecords.length > 0 ? todayRecords.map((r) => (
                  <Link key={r.id} to={`/records/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', borderRadius: 12, padding: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: CATEGORY_BG[r.category] ?? '#f0f7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {CATEGORY_ICON[r.category] ?? CATEGORY_ICON.ETC}
                    </div>
                    <p style={{ flex: 1, fontSize: '0.875rem', color: '#1a2533', lineHeight: 1.45, margin: 0 }}>{r.content}</p>
                  </Link>
                )) : (
                  <p style={{ fontSize: '0.875rem', color: '#8a9ab0', textAlign: 'center', padding: '1rem 0', margin: 0 }}>아직 오늘의 기록이 없어요.</p>
                )}
              </div>
            </section>

            {/* 보호자 추가 링크 */}
            {state.role === 'guardian' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/profile" style={{ fontSize: '0.875rem', color: '#3CAB7E', textDecoration: 'none', textAlign: 'center' }}>
                  {p.name}님 프로필 보기 →
                </Link>
                {pendingSuggestions > 0 && (
                  <Link to="/suggestions" style={{ fontSize: '0.875rem', color: '#3CAB7E', textDecoration: 'none', textAlign: 'center' }}>
                    수정 제안 {pendingSuggestions}건 확인 →
                  </Link>
                )}
              </div>
            )}

            {/* 기록하기 CTA */}
            <button
              className="btn"
              style={{ marginTop: 'auto', gap: '0.5rem' }}
              onClick={() => nav('/records/new')}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M14 2.5l3.5 3.5L6 17.5H2.5V14L14 2.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              기록하기
            </button>
          </>
        )}
      </div>
    </Guard>
  );
}
export function More() {
  const { state, send } = useDemo();
  const nav = useNavigate();
  const [logout, setLogout] = useState(false);

  const roleLabel =
    state.role === 'guardian' ? '돌봄 보호자' : state.role === 'provider' ? '돌봄 제공자' : '기관 담당자';

  const topMenus: [string, string][] =
    state.role === 'guardian'
      ? [['내 프로필', '/settings'], ['담당 돌봄 대상자', '/profile']]
      : state.role === 'provider'
        ? [['내 프로필', '/settings'], ['담당 돌봄 대상자', '/care-info']]
        : [['내 프로필', '/settings'], ['기관 대시보드', '/agency']];

  const midMenus: [string, string][] =
    state.role === 'guardian'
      ? [['돌봄 관계 관리', '/relations'], ['세컨드 보호자 관리', '/secondary'], ['수정 제안함', '/suggestions']]
      : state.role === 'provider'
        ? [['내 기록 이력', '/history'], ['수정 제안함', '/suggestions'], ['정보 요청함', '/requests']]
        : [['활동지원사 관리', '/agency/providers'], ['보호자 정보 연결', '/agency/recipients'], ['배정 관리', '/relations']];

  const bottomMenus: [string, string][] = [
    ['알림 설정', '/settings'],
    ['공지사항', '/help'],
    ['고객센터', '/help'],
    ['서비스 이용약관', '/info/terms'],
    ['전체 데모 안내', '/demo'],
  ];

  const allMenus = [...topMenus, ...midMenus, ...bottomMenus];

  return (
    <Guard>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* 인라인 헤더 */}
        <div style={{ padding: '16px 20px 14px', background: 'white', borderBottom: '1px solid #e8ecf0' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1a2533' }}>더보기</h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 프로필 카드 */}
          <Link
            to="/settings"
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 16, padding: '16px 20px', textDecoration: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22, color: '#8a9ab0', fontWeight: 700 }}>
              ?
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2533', margin: '0 0 2px' }}>{state.name}님</p>
              <p style={{ fontSize: 13, color: '#8a9ab0', margin: 0 }}>{roleLabel}</p>
            </div>
            <span style={{ color: '#c0c8d4', fontSize: 20 }}>›</span>
          </Link>

          {/* 역할 전환 배너 */}
          <div style={{ background: '#f0f7f3', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#3CAB7E', flex: 1 }}>체험 역할 전환</span>
            <Link to="/onboarding" style={{ fontSize: 13, color: '#3CAB7E', fontWeight: 600, textDecoration: 'none' }}>바꾸기 →</Link>
          </div>

          {/* 메뉴 목록 */}
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
            {allMenus.map(([label, to], i) => (
              <Link
                key={label + to}
                to={to}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', color: '#1a2533', textDecoration: 'none', fontSize: 15, borderBottom: i < allMenus.length - 1 ? '1px solid #f0f2f5' : 'none' }}
              >
                {label}
                <span style={{ color: '#c0c8d4', fontSize: 18 }}>›</span>
              </Link>
            ))}
          </div>

          {/* 로그아웃 */}
          <button
            style={{ background: 'none', border: 'none', color: '#e05555', fontSize: 15, fontWeight: 600, padding: '12px 0', cursor: 'pointer', textAlign: 'center' }}
            onClick={() => setLogout(true)}
          >
            로그아웃
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#c0c8d4', margin: 0, paddingBottom: 8 }}>버전 1.0.0</p>
        </div>

        {logout && (
          <Confirm
            title="데모에서 로그아웃할까요?"
            onCancel={() => setLogout(false)}
            onConfirm={() => {
              if (send({ type: 'session', role: state.role, signedIn: false }))
                nav('/onboarding');
            }}
          >
            예시 기록은 브라우저에 남아 다음 로그인에서도 확인할 수 있어요.
          </Confirm>
        )}
      </div>
    </Guard>
  );
}
export function Settings() {
  const { state, send, reset } = useDemo();
  const nav = useNavigate();
  const [name, setName] = useState(state.name);
  const [large, setLarge] = useState(state.largeText);
  const [notify, setNotify] = useState(state.notify);
  const [done, setDone] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <Guard>
      <Page title="내 정보·설정" back="/more">
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (send({ type: 'settings', name, largeText: large, notify }))
              setDone(true);
          }}
        >
          <label>
            예시 표시 이름
            <input
              required
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={large}
              onChange={(e) => setLarge(e.target.checked)}
            />
            큰 글씨로 보기
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            헤더에 새 알림 개수 표시
          </label>
          <p className="muted">
            푸시 알림은 보내지 않습니다. 알림함에서는 모든 데모 알림을 확인할 수
            있어요.
          </p>
          <button className="btn">설정 저장</button>
          {done && (
            <p className="success" role="status">
              설정을 저장했어요.
            </p>
          )}
        </form>
        <Card>
          <h2>데모 다시 시작하기</h2>
          <p>
            직접 입력한 예시 기록과 변경 사항을 지우고 처음 상태로 돌아갑니다.
          </p>
          <button className="btn secondary" onClick={() => setConfirm(true)}>
            예시 데이터 초기화
          </button>
        </Card>
        {confirm && (
          <Confirm
            title="데모 데이터를 초기화할까요?"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (reset()) nav('/onboarding');
            }}
          >
            이 브라우저에서 추가한 데모 데이터는 복구할 수 없습니다.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function Help() {
  return (
    <Page title="도움말" back="/more">
      <Card>
        <h2>시연이 막혔나요?</h2>
        <details>
          <summary>활동지원사에게 기록이 안 보여요</summary>
          <p>
            기관에서 당사자를 연결하고 현재 날짜에 유효한 배정을 만들어주세요.
            역할 선택에서 배정한 지원사를 선택했는지도 확인하세요.
          </p>
        </details>
        <details>
          <summary>다른 기기에서 기록이 안 보여요</summary>
          <p>
            이 데모는 브라우저에만 저장합니다. 같은 브라우저에서 역할을 전환하며
            체험해주세요.
          </p>
        </details>
        <details>
          <summary>AI·음성·미디어는 실제로 작동하나요?</summary>
          <p>
            화면 흐름만 시연합니다. 정리 초안은 입력 내용을 그대로 사용하고,
            음성과 미디어는 예시 카드입니다.
          </p>
        </details>
        <details>
          <summary>처음부터 다시 보고 싶어요</summary>
          <p>설정의 예시 데이터 초기화를 사용하세요.</p>
        </details>
      </Card>
      <Card>
        <h2>문의하기</h2>
        <p>
          발표·시연 담당자에게 현재 역할, 화면 제목, 어떤 버튼을 눌렀는지
          알려주세요. 데모에서는 문의를 외부로 전송하지 않습니다.
        </p>
      </Card>
      <Nav to="/demo">전체 화면 안내</Nav>
    </Page>
  );
}
export function Info() {
  const { topic: path } = useParams();
  const contents: Record<string, [string, string]> = {
    terms: [
      '이용약관 안내',
      '서비스 이용 동의 화면을 설명하기 위한 데모입니다. 실제 서비스 약관은 확정되지 않았으며, 이 화면에서 법적 계약이나 가입이 이루어지지 않습니다.',
    ],
    privacy: [
      '개인정보 안내',
      '가상 인물 정보만 사용해주세요. 입력한 데이터는 현재 브라우저의 localStorage에 저장됩니다. 서버·AI로 전송하지 않습니다. 공유 기기에서는 설정의 예시 데이터 초기화를 사용해주세요. 실제 서비스의 개인정보 처리방침과 별도 동의 체계는 운영 전에 확정해야 합니다.',
    ],
    password: [
      '비밀번호 변경 안내',
      '이 데모에는 비밀번호가 없습니다. 실제 비밀번호를 입력하지 마세요. 예시 계정의 역할 전환으로 로그인 이후 화면을 체험할 수 있습니다.',
    ],
    licenses: [
      '오픈소스 라이선스',
      '화면 구현에 React(MIT), React Router(MIT)를 사용합니다. 빌드 도구로 Vite(MIT), TypeScript(Apache-2.0), Vite PWA(MIT)를 사용합니다. 각 패키지의 라이선스 원문은 배포 패키지에서 확인할 수 있습니다.',
    ],
  };
  const [title, text] = contents[path ?? ''] ?? [
    '안내',
    '해당 안내가 없습니다.',
  ];
  return (
    <Page title={title} back="/more">
      <Card>
        <p>{text}</p>
      </Card>
      <Nav to="/demo" secondary>
        데모 안내로 이동
      </Nav>
    </Page>
  );
}
