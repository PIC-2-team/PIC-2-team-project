import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from './context';
import { categories, roles, today, type Role } from './model';
import { Page, Card, Nav, Guard, Empty } from './UI';
const CONSENT_ITEMS = [
  { label: '기본 개인정보 수집·이용 동의', desc: '서비스 제공을 위한 필수 정보입니다.', required: true },
  { label: '건강·복약정보 등 민감정보 처리 동의', desc: '맞춤형 건강관리 서비스 제공을 위한 필수 정보입니다.', required: true },
  { label: '담당 돌봄 제공자에게 필요한 정보 공유 동의', desc: '더 나은 돌봄 서비스를 위한 필수 정보입니다.', required: true },
  { label: '마케팅·부가서비스 동의', desc: '다양한 이벤트와 유용한 정보를 받아보실 수 있습니다.', required: false },
];

export function Consent() {
  const [checks, setChecks] = useState([false, false, false, false]);
  const allRequired = checks.slice(0, 3).every(Boolean);

  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.25rem 2rem', background: 'white', overflowY: 'auto' }}>
      {/* 일러스트 */}
      <div style={{ width: 140, height: 140, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          {/* 문서 */}
          <rect x="12" y="8" width="42" height="52" rx="6" fill="white" stroke="#c8e6d8" strokeWidth="2" />
          <line x1="21" y1="23" x2="45" y2="23" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="21" y1="31" x2="45" y2="31" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="21" y1="39" x2="35" y2="39" stroke="#c8e6d8" strokeWidth="2.5" strokeLinecap="round" />
          {/* 방패+체크 */}
          <circle cx="50" cy="52" r="14" fill="#3CAB7E" />
          <polyline points="44,52 48,56 57,46" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* 장식 */}
        <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 16, color: '#3CAB7E', opacity: 0.5 }}>✦</span>
        <span style={{ position: 'absolute', bottom: 14, left: 10, fontSize: 12, color: '#3CAB7E', opacity: 0.4 }}>✦</span>
        <span style={{ position: 'absolute', top: 30, left: -4, fontSize: 10, color: '#3CAB7E', opacity: 0.3 }}>—</span>
        <span style={{ position: 'absolute', top: 20, right: -4, fontSize: 10, color: '#3CAB7E', opacity: 0.3 }}>—</span>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1a2533', margin: '0 0 0.5rem', textAlign: 'center' }}>이용 동의</h1>
      <p style={{ fontSize: '0.875rem', color: '#8a9ab0', margin: '0 0 1.75rem', textAlign: 'center', lineHeight: 1.5 }}>서비스 이용을 위해 아래 내용을 확인해주세요</p>

      {/* 동의 항목 */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {CONSENT_ITEMS.map((item, i) => (
          <label
            key={item.label}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem', background: 'white', borderRadius: 14, padding: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontWeight: 400 }}
          >
            <div
              onClick={() => setChecks((v) => v.map((x, j) => i === j ? !x : x))}
              style={{ width: 28, height: 28, borderRadius: 8, border: checks[i] ? 'none' : '2px solid #dde3ea', background: checks[i] ? '#3CAB7E' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            >
              {checks[i] && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polyline points="2,7 5.5,10.5 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a2533', margin: '0 0 0.2rem', lineHeight: 1.4 }}>
                <span style={{ color: '#3CAB7E' }}>{item.required ? '[필수]' : '[선택]'}</span> {item.label}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#8a9ab0', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
            </div>
            <span style={{ color: '#c0c8d4', fontSize: '1.25rem', lineHeight: 1 }}>›</span>
          </label>
        ))}

        {/* 전체 약관 보기 */}
        <Link to="/info/terms" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0f2f5', borderRadius: 14, padding: '1rem', textDecoration: 'none', color: '#4a5568' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="2" width="14" height="16" rx="2" stroke="#8a9ab0" strokeWidth="1.5" />
            <line x1="6" y1="7" x2="14" y2="7" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="10" x2="14" y2="10" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="13" x2="10" y2="13" stroke="#8a9ab0" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1, fontSize: '0.875rem' }}>전체 약관 보기</span>
          <span style={{ color: '#c0c8d4', fontSize: '1.25rem' }}>›</span>
        </Link>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: 'auto' }}>
        {allRequired ? (
          <Nav to="/onboarding">동의하고 시작하기</Nav>
        ) : (
          <button className="btn" disabled>필수 항목을 모두 확인해주세요</button>
        )}
        <Nav to="/onboarding" secondary>동의 건너뛰고 데모 보기</Nav>
      </div>
    </div>
  );
}
const ROLE_META: Record<Role, { icon: React.ReactNode; desc: string; color: string }> = {
  guardian: {
    color: '#e8f5ee',
    desc: '일상을 기록하고 돌봄 제공자의 제안을 검토해요.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="13" r="6" fill="#3CAB7E" opacity="0.8" />
        <path d="M4 30c0-7 5.4-12 12-12s12 5 12 12" stroke="#3CAB7E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M22 10l2 2 4-4" stroke="#3CAB7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  provider: {
    color: '#fff3e8',
    desc: '당사자를 이해하고 현장 돌봄 경험을 기록해요.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill="#f57c00" opacity="0.7" />
        <circle cx="22" cy="16" r="6" fill="#f9a825" opacity="0.7" />
        <path d="M6 28c0-5 4-9 9-9" stroke="#f57c00" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  agency: {
    color: '#e8f0fb',
    desc: '돌봄 관계를 연결하고 정보 요청을 중계해요.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="4" y="12" width="24" height="16" rx="3" fill="#5b8dee" opacity="0.7" />
        <rect x="10" y="5" width="12" height="8" rx="2" fill="#3a6fd4" opacity="0.8" />
        <line x1="16" y1="12" x2="16" y2="28" stroke="white" strokeWidth="1.5" />
        <line x1="4" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
};

export function Onboarding() {
  const { send } = useDemo();
  const navigate = useNavigate();
  const choose = (role: Role) => {
    if (send({ type: 'session', role, signedIn: false }))
      navigate(role === 'provider' ? '/onboarding/code' : '/register');
  };
  return (
    <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#F5F6F7' }}>
      {/* 브랜드 헤더 */}
      <div style={{ padding: '3rem 1.5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M20 6C12 6 6 12 6 20s6 14 14 14 14-6 14-14" stroke="#3CAB7E" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M20 6c4 0 7 5 7 14" stroke="#3CAB7E" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
              <circle cx="20" cy="20" r="4" fill="#3CAB7E" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#3CAB7E', margin: 0, letterSpacing: '-1px' }}>삶결</h1>
            <p style={{ fontSize: '0.875rem', color: '#8a9ab0', margin: '4px 0 0' }}>삶의 결을 잇다</p>
          </div>
        </div>
      </div>

      {/* 역할 선택 */}
      <div style={{ padding: '0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a2533', margin: '0 0 0.25rem', textAlign: 'center' }}>역할을 선택해주세요</p>
        <p style={{ fontSize: '0.8125rem', color: '#8a9ab0', margin: '0 0 0.5rem', textAlign: 'center' }}>역할을 바꿔도 같은 기록이 이어집니다</p>

        {(Object.keys(roles) as Role[]).map((role) => {
          const meta = ROLE_META[role];
          return (
            <button
              key={role}
              onClick={() => choose(role)}
              style={{ width: '100%', background: 'white', border: '1.5px solid #e8ecf0', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2533', margin: '0 0 4px' }}>{roles[role]}</p>
                <p style={{ fontSize: '0.8125rem', color: '#8a9ab0', margin: 0, lineHeight: 1.4 }}>{meta.desc}</p>
              </div>
              <span style={{ color: '#c0c8d4', fontSize: 20, flexShrink: 0 }}>›</span>
            </button>
          );
        })}

        {/* 바로 역할 전환 (데모 전용) */}
        <div style={{ background: '#f0f7f3', borderRadius: 14, padding: '14px 16px', marginTop: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3CAB7E', margin: '0 0 10px' }}>⚡ 바로 체험하기 (가입 건너뜀)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.keys(roles) as Role[]).map((role) => (
              <button
                key={role}
                style={{ flex: 1, padding: '8px 4px', background: 'white', border: '1.5px solid #c8dfd4', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#3CAB7E', cursor: 'pointer' }}
                onClick={() => {
                  if (send({ type: 'session', role })) navigate('/home');
                }}
              >
                {roles[role]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 */}
      <div style={{ padding: '1.25rem 1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#8a9ab0', margin: 0 }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: '#3CAB7E', fontWeight: 600, textDecoration: 'none' }}>로그인</Link>
        </p>
        <Link to="/demo" style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#b0bac6', textDecoration: 'none' }}>
          전체 데모 안내 보기
        </Link>
      </div>
    </div>
  );
}
export function AgencyCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  return (
    <Page title="소속 기관 확인" back="/onboarding">
      <p>예시 기관 코드로 가입 과정을 체험하세요.</p>
      <p className="hint">
        체험 코드: DEMO01 · 실제 기관 조회는 하지 않습니다.
      </p>
      <form
        className="demo-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().toUpperCase() === 'DEMO01') nav('/register');
          else setError('예시 코드 DEMO01을 입력해주세요.');
        }}
      >
        <label>
          기관 코드
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="btn">기관 확인</button>
      </form>
    </Page>
  );
}
export function Account({ register = false }: { register?: boolean }) {
  const { state, send } = useDemo();
  const nav = useNavigate();
  const [name, setName] = useState(state.name);
  return (
    <Page
      title={register ? '예시 계정으로 가입' : '데모 로그인'}
      back="/onboarding"
    >
      <Card className="accent">
        <span className="tag">{roles[state.role]}</span>
        <p>
          실제 계정이나 비밀번호를 수집하지 않습니다. Google 버튼도 로그인 완료
          화면만 시연합니다.
        </p>
      </Card>
      <form
        className="demo-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            register &&
            !send({
              type: 'settings',
              name,
              largeText: state.largeText,
              notify: state.notify,
            })
          )
            return;
          if (send({ type: 'session', role: state.role })) nav('/home');
        }}
      >
        {register && (
          <label>
            예시 표시 이름
            <input
              value={name}
              required
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label>
          체험 계정
          <input readOnly value="demo@example.invalid" />
        </label>
        {state.role === 'provider' && (
          <label>
            체험할 활동지원사
            <select
              value={state.providerId}
              onChange={(e) =>
                send({
                  type: 'session',
                  role: 'provider',
                  providerId: e.target.value,
                  signedIn: false,
                })
              }
            >
              {state.providers
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.id}
                  </option>
                ))}
            </select>
          </label>
        )}
        {register && state.role === 'agency' && (
          <p className="hint">가입 완료 시 기관 코드 DEMO01이 표시됩니다.</p>
        )}
        <button className="btn">
          {register ? '예시 계정으로 가입 완료' : '예시 계정으로 로그인'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            if (send({ type: 'session', role: state.role })) nav('/home');
          }}
        >
          Google 로그인 완료 체험
        </button>
      </form>
      <Nav to={register ? '/login' : '/register'} secondary>
        {register ? '로그인으로 이동' : '가입 화면으로 이동'}
      </Nav>
    </Page>
  );
}
export function ProfileForm() {
  const { state, send } = useDemo();
  const { id } = useParams();
  const nav = useNavigate();
  const person = state.people.find((p) => p.id === id);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(person?.name ?? '');
  const [birth, setBirth] = useState(person?.birth ?? '');
  const [disability, setDisability] = useState(person?.disability ?? '');
  const [note, setNote] = useState(person?.note ?? '');
  return (
    <Guard allowed={['guardian']}>
      <Page title={id ? '당사자 프로필 수정' : '당사자 등록'} back="/profile">
        <p className="step-label">
          {step} / 2 · {step === 1 ? '기본 정보' : '돌봄에 필요한 정보'}
        </p>
        <p className="hint">실제 개인정보 대신 가상 예시를 입력해주세요.</p>
        <form
          className="demo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 1) {
              setStep(2);
              return;
            }
            if (send({ type: 'profile', id, name, birth, disability, note }))
              nav('/profile');
          }}
        >
          {step === 1 ? (
            <>
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
                예시 생년월일
                <input
                  type="date"
                  required
                  max={today()}
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                장애 유형
                <select
                  value={disability}
                  required
                  onChange={(e) => setDisability(e.target.value)}
                >
                  <option value="">선택해주세요</option>
                  {['지적장애', '자폐성장애', '기타', '선택하지 않음'].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                처음 만나는 돌봄자에게
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
              </label>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                이전 단계
              </button>
            </>
          )}
          <button className="btn">{step === 1 ? '다음' : '프로필 저장'}</button>
        </form>
      </Page>
    </Guard>
  );
}
export function Profile() {
  const { state } = useDemo();
  const p = state.people.find((p) => p.id === state.recipientId);
  const pinned = state.records.filter(
    (r) => r.recipientId === state.recipientId && r.pinned && !r.deleted,
  );
  return (
    <Guard person>
      <Page title="당사자 프로필">
        <Card className="accent">
          <span className="tag">가상 인물</span>
          <h2>{p?.name}님</h2>
          <p className="muted">고유 번호 {p?.id}</p>
        </Card>
        <Card>
          <p>생년월일 · {p?.birth}</p>
          <p>장애 유형 · {p?.disability}</p>
          <h2>나를 이해하는 작은 단서</h2>
          <p>{p?.note || '아직 작성된 소개가 없어요.'}</p>
        </Card>
        {pinned.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2533', margin: '0.25rem 0 0' }}>중요 정보</h2>
            {pinned.map((r) => (
              <Card key={r.id}>
                <span className="tag">{categories[r.category]}</span>
                <p>{r.content}</p>
              </Card>
            ))}
          </>
        )}
        {state.role === 'guardian' && (
          <Nav to={`/profile/${p?.id}/edit`}>프로필 수정</Nav>
        )}
        <Nav to="/care-info" secondary>
          돌봄정보 보기
        </Nav>
      </Page>
    </Guard>
  );
}
export function DemoGuide() {
  return (
    <Page
      title="삶결 전체 데모"
      back="/"
      eyebrow="한 사람의 삶의 결을 이어가는 방법"
    >
      <Card className="accent">
        <h2>한 브라우저에서 역할을 바꿔보세요</h2>
        <p>
          보호자의 기록이 활동지원사에게 전달되고 기관이 돌봄을 연결하는
          과정입니다. 모든 정보는 가상 예시입니다.
        </p>
        <Nav to="/onboarding">체험 시작하기</Nav>
      </Card>
      <Card>
        <h2>추천 시연 순서</h2>
        <ol>
          <li>보호자 → 당사자 등록·기록 작성·중요 정보 고정</li>
          <li>기관 → 등록한 당사자 연결·지원사 배정</li>
          <li>활동지원사 → 돌봄정보 확인·수정 제안</li>
          <li>보호자 → 제안 비교·승인</li>
          <li>기관 → 돌봄 종료 → 제공자 접근 제한 확인</li>
        </ol>
      </Card>
      <Card>
        <h2>전체 화면 둘러보기</h2>
        {[
          ['/onboarding', '역할 선택'],
          ['/register', '가입'],
          ['/login', '로그인'],
          ['/onboarding/code', '기관 코드'],
          ['/profile/new', '당사자 등록'],
          ['/records/new', '기록 작성·정리'],
          ['/records', '기록 목록·상세'],
          ['/suggestions', '수정 제안함'],
          ['/relations', '돌봄 관계'],
          ['/transfer', '기관 이전'],
          ['/secondary', '세컨드 보호자'],
          ['/agency', '기관 대시보드'],
          ['/agency/assign', '지원사 배정'],
          ['/agency/providers', '지원사 관리'],
          ['/agency/recipients', '보호자 연결'],
          ['/requests', '요청·중계'],
          ['/notifications', '알림함'],
          ['/history', '기록 이력'],
          ['/access-log', '접근 이력'],
          ['/settings', '설정'],
          ['/help', '도움말'],
        ].map(([to, label]) => (
          <Link className="menu-link" key={to} to={to}>
            {label}
            <span>열기 →</span>
          </Link>
        ))}
      </Card>
      <Empty>
        실제 인증·서버 권한·AI·음성 인식·파일 업로드는 연결되지 않습니다. 예시
        데이터는 이 브라우저에만 저장됩니다.
      </Empty>
    </Page>
  );
}
