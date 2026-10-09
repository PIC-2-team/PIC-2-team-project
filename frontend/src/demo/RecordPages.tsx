import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useDemo } from './context';
import {
  actorId,
  canAccess,
  categories,
  roles,
  today,
  type CareRecord,
} from './model';
import { Calendar } from './Calendar';
import { Card, Confirm, Empty, Guard, Nav, Page } from './UI';

const CARE_META: Record<string, { bg: string; icon: React.ReactNode }> = {
  COMMUNICATION: {
    bg: '#e8f5ee',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="14" cy="15" r="9" fill="#3CAB7E" />
        <circle cx="24" cy="19" r="9" fill="#2d9468" />
        <circle cx="11" cy="13" r="3.5" fill="white" opacity="0.6" />
        <circle cx="17" cy="13" r="3.5" fill="white" opacity="0.6" />
        <circle cx="21" cy="17" r="3.5" fill="white" opacity="0.6" />
        <circle cx="27" cy="17" r="3.5" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  LIFESTYLE: {
    bg: '#fff3e8',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 17L18 7l12 10v14H6V17z" fill="#f57c00" />
        <rect x="14" y="22" width="8" height="9" rx="1" fill="white" opacity="0.8" />
        <rect x="16" y="19" width="4" height="4" rx="0.5" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  PREFERENCE: {
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 30s-14-9-14-18a9 9 0 0118 0 9 9 0 0118 0c0 9-14 18-22 18z" fill="#e05555" />
      </svg>
    ),
  },
  BEHAVIOR: {
    bg: '#fff8e1',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 5L34 31H2L18 5z" fill="#f9a825" />
        <rect x="16.5" y="14" width="3" height="9" rx="1.5" fill="white" />
        <circle cx="18" cy="26" r="2" fill="white" />
      </svg>
    ),
  },
  HEALTH_MEDICATION: {
    bg: '#e8f0fb',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="8" y="14" width="20" height="9" rx="4.5" fill="#5b8dee" transform="rotate(-45 18 18)" />
        <line x1="11" y1="25" x2="25" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  EMERGENCY: {
    bg: '#fdedf0',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="10" y="18" width="16" height="11" rx="2" fill="#e05555" />
        <path d="M13 18V14a5 5 0 0110 0v4" stroke="#e05555" strokeWidth="2.5" fill="none" />
        <ellipse cx="18" cy="13" rx="7" ry="5" fill="#e05555" opacity="0.25" />
        <circle cx="18" cy="23" r="2.5" fill="white" />
        <line x1="8" y1="14" x2="5" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="14" x2="31" y2="11" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="10" x2="18" y2="7" stroke="#e05555" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
};
export function RecordCard({ record }: { record: CareRecord }) {
  return (
    <Link to={`/records/${record.id}`} className="demo-card record-link">
      <div className="record-meta">
        <span>
          {categories[record.category]} · {record.pinned ? '중요 정보' : ''}
        </span>
        <span>{record.date}</span>
      </div>
      <p>{record.content}</p>
      <span className="muted">{roles[record.author]} 작성 · 상세 보기 →</span>
    </Link>
  );
}
export function RecordList({ care = false }: { care?: boolean }) {
  const { state } = useDemo();
  const { categoryId } = useParams();
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const selected = categoryId ?? category;
  const records = state.records.filter(
    (r) =>
      r.recipientId === state.recipientId &&
      !r.deleted &&
      (!date || r.date === date) &&
      (!selected || r.category === selected) &&
      r.content.includes(query),
  );
  return (
    <Guard person>
      <Page
        title={
          categoryId
            ? (categories[categoryId] ?? '돌봄정보')
            : care
              ? '돌봄정보'
              : '생활기록'
        }
        back={categoryId ? '/care-info' : '/home'}
      >
        <Card className="accent">
          <h2>
            {state.people.find((p) => p.id === state.recipientId)?.name}님의{' '}
            {care ? '돌봄 안내' : '일상'}
          </h2>
          <p className="muted">
            기록은 같은 브라우저의 다른 역할에서도 이어집니다.
          </p>
          {care && (
            <Nav to="/profile" secondary>
              당사자 프로필 보기
            </Nav>
          )}
        </Card>
        {care && !categoryId ? (
          <>
            {/* Figma 스타일 아이콘 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {Object.entries(categories).map(([id, label]) => {
                const meta = CARE_META[id];
                const count = records.filter((r) => r.category === id).length;
                return (
                  <Link
                    key={id}
                    to={`/care-info/${id}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem', background: 'white', borderRadius: 16, padding: '1.5rem 1rem 1rem', textDecoration: 'none', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', textAlign: 'center' }}
                  >
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {meta.icon}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1a2533' }}>{label}</span>
                      <span style={{ fontSize: '1.125rem', color: '#c0c8d4', lineHeight: 1 }}>›</span>
                    </div>
                    {count > 0 && <span style={{ fontSize: '0.75rem', color: '#8a9ab0' }}>{count}개</span>}
                  </Link>
                );
              })}
            </div>
            {records.some((r) => r.pinned) && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2533', margin: '0.5rem 0 0' }}>중요 정보</h2>
                {records.filter((r) => r.pinned).map((r) => (
                  <RecordCard key={r.id} record={r} />
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <Calendar
              records={state.records.filter(
                (r) => r.recipientId === state.recipientId && !r.deleted,
              )}
              selected={date}
              onSelect={setDate}
            />
            <label>
              내용 검색
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="기록에서 찾기"
              />
            </label>
            <div className="grid-two">
              <label>
                날짜
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              {!categoryId && (
                <label>
                  유형
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">전체 유형</option>
                    {Object.entries(categories).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              className="btn secondary"
              onClick={() => {
                setDate('');
                setCategory('');
                setQuery('');
              }}
            >
              필터 초기화
            </button>
            <p className="muted">{records.length}개의 기록</p>
            {records.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
            {!records.length && (
              <Empty>
                조건에 맞는 기록이 없어요. 필터를 바꾸거나 첫 기록을
                작성해주세요.
              </Empty>
            )}
          </>
        )}
        {state.role !== 'agency' && (
          <Nav
            to={`/records/new${categoryId ? '?category=' + categoryId : ''}`}
          >
            기록하기
          </Nav>
        )}
      </Page>
    </Guard>
  );
}
const ACTIVITY_CHIPS = [
  { label: '야외활동', cat: 'LIFESTYLE' },
  { label: '식사', cat: 'LIFESTYLE' },
  { label: '수면', cat: 'LIFESTYLE' },
  { label: '투약', cat: 'HEALTH_MEDICATION' },
  { label: '기타', cat: 'COMMUNICATION' },
];

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

export function RecordForm() {
  const { state, send } = useDemo();
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const record = state.records.find((r) => r.id === id);
  const [step, setStep] = useState(1);
  const [content, setContent] = useState(record?.content ?? '');
  const [category, setCategory] = useState(
    record?.category ?? params.get('category') ?? 'COMMUNICATION',
  );
  const [media, setMedia] = useState(record?.media ?? '');
  const [activityChip, setActivityChip] = useState('야외활동');
  const [pinned, setPinned] = useState(false);

  const now = new Date();
  const hours = now.getHours();
  const ampm = hours < 12 ? '오전' : '오후';
  const h = hours % 12 || 12;
  const timeLabel = `${ampm} ${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (
    id &&
    (!record ||
      record.deleted ||
      record.author !== state.role ||
      record.authorId !== actorId(state))
  )
    return (
      <Page title="수정할 수 없어요">
        <Empty>본인이 작성한 기록만 수정할 수 있습니다.</Empty>
        <Nav to="/records">목록으로</Nav>
      </Page>
    );

  if (id) {
    /* 수정 모드: 기존 심플 폼 유지 */
    return (
      <Guard person allowed={['guardian', 'provider']}>
        <Page title="기록 수정" back={`/records/${id}`}>
          <form
            className="demo-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (send({ type: 'record', id, content, category, media })) nav('/records');
            }}
          >
            <label>
              카테고리
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              기록 내용
              <textarea required rows={6} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} />
            </label>
            <p className="muted">{content.length} / 2,000자</p>
            <button className="btn" disabled={!content.trim()}>수정 저장</button>
          </form>
        </Page>
      </Guard>
    );
  }

  return (
    <Guard person allowed={['guardian', 'provider']}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* 헤더 */}
        <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e8ecf0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/records" style={{ color: '#1a2533', textDecoration: 'none', fontSize: 22, lineHeight: 1, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</Link>
          <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, color: '#1a2533' }}>
            {step === 1 ? '기록 작성' : 'AI 정리 확인'}
          </h1>
          {step === 2 && (
            <span style={{ fontSize: 12, color: '#8a9ab0', fontWeight: 500 }}>
              {step} / 2
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {step === 1 ? (
            <form
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
              onSubmit={(e) => {
                e.preventDefault();
                const chip = ACTIVITY_CHIPS.find((c) => c.label === activityChip);
                if (chip) setCategory(chip.cat);
                setStep(2);
              }}
            >
              {/* 날짜 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#8a9ab0', fontWeight: 500 }}>날짜</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a2533' }}>{formatDateLabel(today())}</span>
              </div>

              {/* 시간 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#8a9ab0', fontWeight: 500 }}>시간</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a2533' }}>{timeLabel}</span>
              </div>

              {/* 활동 유형 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2533', margin: '0 0 12px' }}>활동 유형</p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {ACTIVITY_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setActivityChip(chip.label)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 50,
                        border: '1.5px solid',
                        borderColor: activityChip === chip.label ? '#3CAB7E' : '#e8ecf0',
                        background: activityChip === chip.label ? '#3CAB7E' : 'white',
                        color: activityChip === chip.label ? 'white' : '#4a5568',
                        fontSize: 14,
                        fontWeight: activityChip === chip.label ? 600 : 400,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2533', margin: '0 0 10px' }}>메모</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="오늘의 활동을 기록해 주세요."
                  style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 15, color: '#1a2533', lineHeight: 1.6, background: 'transparent', padding: 0, boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 12, color: '#c0c8d4', margin: '4px 0 0', textAlign: 'right' }}>{content.length}/500</p>
              </div>

              {/* 사진 첨부 */}
              <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #f0f2f5' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2533', margin: '0 0 12px' }}>사진 첨부</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setMedia(media ? '' : 'photo')}
                    style={{ width: 64, height: 64, borderRadius: 12, border: '1.5px dashed #c0c8d4', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8a9ab0', fontSize: 24 }}
                  >
                    {media ? '✓' : '+'}
                  </button>
                  {media && (
                    <div className="sample-media" style={{ flex: 1, minHeight: 64, fontSize: 13 }}>
                      사진 예시 · 실제 파일 없음
                    </div>
                  )}
                  {!media && <span style={{ fontSize: 12, color: '#c0c8d4' }}>0/5</span>}
                </div>
              </div>

              {/* 저장하기 버튼 */}
              <div style={{ padding: '16px 20px 24px', background: '#F5F6F7' }}>
                <button className="btn" style={{ width: '100%' }} disabled={!content.trim()}>
                  다음 (AI 정리 확인)
                </button>
              </div>
            </form>
          ) : (
            <form
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (send({ type: 'record', id, content, category, media })) nav('/records');
              }}
            >
              {/* AI 확인 헤더 카드 */}
              <div style={{ padding: '16px 20px', background: '#f0f7f3', borderBottom: '1px solid #c8e6d8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3CAB7E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="8" fill="white" opacity="0.2" />
                      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2533', margin: 0 }}>AI가 다음과 같이 정리했어요</p>
                    <p style={{ fontSize: 12, color: '#8a9ab0', margin: 0 }}>내용을 직접 수정할 수 있어요</p>
                  </div>
                </div>
              </div>

              {/* 정리된 내용 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', flex: 1 }}>
                <textarea
                  required
                  rows={6}
                  value={content}
                  maxLength={2000}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 15, color: '#1a2533', lineHeight: 1.6, background: 'transparent', padding: 0, boxSizing: 'border-box' }}
                />
              </div>

              {/* 카테고리 표시 (AI 자동 설정) */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8a9ab0' }}>AI 분류:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#3CAB7E', background: '#f0f7f3', padding: '3px 10px', borderRadius: 20 }}>{categories[category]}</span>
              </div>

              {/* 중요 정보 고정 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2533', margin: 0 }}>중요 정보로 고정</p>
                  <p style={{ fontSize: 12, color: '#8a9ab0', margin: '2px 0 0' }}>돌봄정보 상단에 고정됩니다</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  style={{
                    width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                    background: pinned ? '#3CAB7E' : '#e8ecf0', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: pinned ? 21 : 3, width: 20, height: 20,
                    borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* 버튼 영역 */}
              <div style={{ padding: '16px 20px 24px', background: '#F5F6F7', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn" disabled={!content.trim()}>저장하기</button>
                <button type="button" className="btn secondary" onClick={() => setStep(1)}>입력 단계로 돌아가기</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Guard>
  );
}
export function RecordDetail() {
  const { state, send } = useDemo();
  const { id } = useParams();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const record = state.records.find((r) => r.id === id && !r.deleted);
  const logged = useRef('');
  useEffect(() => {
    const key = id + state.role + state.providerId;
    if (
      logged.current !== key &&
      record &&
      state.signedIn &&
      canAccess(state, record.recipientId)
    ) {
      logged.current = key;
      send({ type: 'visit', text: '기록 상세 열람' });
    }
  }, [id, state, record, send]);
  if (!record)
    return (
      <Page title="기록이 없어요">
        <Empty>삭제되었거나 존재하지 않는 기록입니다.</Empty>
        <Nav to="/records">목록으로</Nav>
      </Page>
    );
  if (!canAccess(state, record.recipientId))
    return (
      <Page title="접근할 수 없어요">
        <Empty>이 기록의 당사자에게 배정되지 않았어요.</Empty>
        <Nav to="/home">홈으로</Nav>
      </Page>
    );
  const own =
    record.author === state.role && record.authorId === actorId(state);
  return (
    <Guard>
      <Page title="기록 상세" back="/records">
        <Card>
          <div className="record-meta">
            <span>{record.date}</span>
            <span>{roles[record.author]} 작성</span>
          </div>
          <span className="tag">
            {categories[record.category]}
            {record.pinned ? ' · 중요 정보' : ''}
          </span>
          <p>{record.content}</p>
          {record.media && (
            <div className="sample-media">
              {record.media === 'photo'
                ? '사진'
                : record.media === 'video'
                  ? '영상'
                  : '음성'}{' '}
              첨부 예시 · 실제 파일 없음
            </div>
          )}
        </Card>
        {state.role === 'guardian' && (
          <button
            className="btn secondary"
            onClick={() => send({ type: 'pin', id: record.id })}
          >
            {record.pinned ? '중요 정보 해제' : '중요 정보로 고정'}
          </button>
        )}
        {own && (
          <>
            <Nav to={`/records/${id}/edit`}>기록 수정</Nav>
            <button className="btn secondary" onClick={() => setConfirm(true)}>
              기록 삭제
            </button>
          </>
        )}
        {state.role === 'provider' && record.author === 'guardian' && (
          <Nav to={`/records/${id}/suggest`}>수정 제안하기</Nav>
        )}
        {record.history.length > 0 && (
          <Card>
            <h2>수정 전 기록</h2>
            {record.history.map((text, i) => (
              <p key={i} className="hint">
                {i + 1}차 · {text}
              </p>
            ))}
          </Card>
        )}
        {confirm && (
          <Confirm
            title="기록을 삭제할까요?"
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              if (send({ type: 'delete', id: record.id })) nav('/history');
            }}
          >
            삭제한 기록은 내 기록 이력에서 복구할 수 있어요.
          </Confirm>
        )}
      </Page>
    </Guard>
  );
}
export function SuggestForm() {
  const { state, send } = useDemo();
  const { id } = useParams();
  const r = state.records.find((r) => r.id === id);
  const [text, setText] = useState(r?.content ?? '');
  const nav = useNavigate();
  if (r && !canAccess(state, r.recipientId))
    return (
      <Page title="접근할 수 없어요">
        <Nav to="/home">홈으로</Nav>
      </Page>
    );
  return (
    <Guard person allowed={['provider']}>
      <Page title="수정 제안" back={`/records/${id}`}>
        {r ? (
          <>
            <Card>
              <h2>현재 내용</h2>
              <p>{r.content}</p>
            </Card>
            <form
              className="demo-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (send({ type: 'suggest', recordId: r.id, content: text }))
                  nav('/suggestions');
              }}
            >
              <label>
                제안 내용
                <textarea
                  rows={6}
                  required
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <p className="hint">보호자가 승인해야 원본에 반영됩니다.</p>
              <button className="btn">제안 전송</button>
            </form>
          </>
        ) : (
          <Empty>기록을 찾을 수 없어요.</Empty>
        )}
      </Page>
    </Guard>
  );
}
export function Suggestions() {
  const { state, send } = useDemo();
  return (
    <Guard allowed={['guardian', 'provider']}>
      <Page title="수정 제안함" back="/more">
        {!state.suggestions.length && <Empty>아직 수정 제안이 없어요.</Empty>}
        {state.suggestions
          .filter((x) => {
            const r = state.records.find((r) => r.id === x.recordId);
            return r && canAccess(state, r.recipientId);
          })
          .map((x) => (
            <Card key={x.id}>
              <span className="tag">
                {
                  {
                    pending: '검토 대기',
                    approved: '승인됨',
                    rejected: '거절됨',
                  }[x.status]
                }
              </span>
              <h2>현재 내용과 제안 비교</h2>
              <p className="muted">제안 당시 원본</p>
              <p>{x.original}</p>
              <hr className="divider" />
              <p className="muted">제안 내용</p>
              <p>{x.content}</p>
              {x.status === 'pending' && state.role === 'guardian' && (
                <div className="actions">
                  <button
                    className="btn secondary"
                    onClick={() =>
                      send({ type: 'review', id: x.id, approve: false })
                    }
                  >
                    거절
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      send({ type: 'review', id: x.id, approve: true })
                    }
                  >
                    승인
                  </button>
                </div>
              )}
              <Nav to={`/records/${x.recordId}`} secondary>
                현재 기록 보기
              </Nav>
            </Card>
          ))}
      </Page>
    </Guard>
  );
}
export function History() {
  const { state, send } = useDemo();
  const records = state.records.filter(
    (r) =>
      r.author === state.role &&
      r.authorId === actorId(state) &&
      canAccess(state, r.recipientId),
  );
  return (
    <Guard allowed={['guardian', 'provider']}>
      <Page title="내 기록 이력" back="/more">
        {records.map((r) => (
          <Card key={r.id}>
            <span className="tag">{r.deleted ? '삭제됨' : '저장됨'}</span>
            <p>{r.content}</p>
            {r.deleted ? (
              <button
                className="btn secondary"
                onClick={() => send({ type: 'restore', id: r.id })}
              >
                기록 복구
              </button>
            ) : (
              <Nav to={`/records/${r.id}`} secondary>
                상세·수정 이력 보기
              </Nav>
            )}
          </Card>
        ))}
        {!records.length && <Empty>아직 작성한 기록이 없어요.</Empty>}
      </Page>
    </Guard>
  );
}
