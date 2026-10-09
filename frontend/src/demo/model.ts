export type Role = 'guardian' | 'provider' | 'agency';
export const roles: Record<Role, string> = {
  guardian: '돌봄 보호자',
  provider: '활동지원사',
  agency: '기관 담당자',
};
export const categories: Record<string, string> = {
  COMMUNICATION: '의사소통',
  PREFERENCE: '선호/비선호',
  LIFESTYLE: '생활습관',
  HEALTH_MEDICATION: '건강복약',
  BEHAVIOR: '주의사항',
  EMERGENCY: '위기대응',
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const uid = () => crypto.randomUUID();
export type Person = {
  id: string;
  name: string;
  birth: string;
  disability: string;
  note: string;
  linked: boolean;
};
export type CareRecord = {
  id: string;
  recipientId: string;
  content: string;
  category: string;
  author: Role;
  authorId: string;
  date: string;
  pinned: boolean;
  media: string;
  deleted: boolean;
  history: string[];
  revision: number;
};
export type Demo = {
  version: 1;
  role: Role;
  signedIn: boolean;
  recipientId: string;
  providerId: string;
  name: string;
  agency: string;
  people: Person[];
  providers: { id: string; name: string; active: boolean }[];
  assignments: {
    id: string;
    recipientId: string;
    providerId: string;
    start: string;
    end: string;
    active: boolean;
  }[];
  records: CareRecord[];
  suggestions: {
    id: string;
    recordId: string;
    content: string;
    original: string;
    revision: number;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  requests: {
    id: string;
    recipientId: string;
    content: string;
    kind: 'information' | 'behavior';
    status: 'pending' | 'relayed' | 'answered';
    response: string;
  }[];
  notifications: {
    id: string;
    role: Role;
    text: string;
    to: string;
    read: boolean;
  }[];
  logs: { id: string; text: string; at: string; role: Role }[];
  secondary: { name: string; contact: string } | null;
  largeText: boolean;
  notify: boolean;
};
export function createDemo(): Demo {
  return {
    version: 1,
    role: 'guardian',
    signedIn: false,
    recipientId: 'p1',
    providerId: 's1',
    name: '김보호',
    agency: '삶결 예시 복지관',
    people: [
      {
        id: 'p1',
        name: '김하루',
        birth: '2002-05-12',
        disability: '지적장애',
        note: '그림으로 다음 일정을 알려주면 편안해해요.',
        linked: true,
      },
      {
        id: 'p2',
        name: '이봄',
        birth: '2005-03-10',
        disability: '자폐성장애',
        note: '처음 만날 때 충분한 시간을 주세요.',
        linked: true,
      },
    ],
    providers: [
      { id: 's1', name: '박돌봄', active: true },
      { id: 's2', name: '이동행', active: true },
    ],
    assignments: [
      {
        id: 'a1',
        recipientId: 'p1',
        providerId: 's1',
        start: today(),
        end: '',
        active: true,
      },
    ],
    records: [
      {
        id: 'r1',
        recipientId: 'p1',
        content: '외출 전 다음 장소를 그림으로 보여주면 준비하기 편안해해요.',
        category: 'COMMUNICATION',
        author: 'guardian',
        authorId: 'guardian',
        date: today(),
        pinned: true,
        media: '',
        deleted: false,
        history: [],
        revision: 0,
      },
      {
        id: 'r2',
        recipientId: 'p1',
        content: '오늘 파란 색연필로 그림 그리기를 즐겼어요.',
        category: 'PREFERENCE',
        author: 'provider',
        authorId: 's1',
        date: today(),
        pinned: false,
        media: '',
        deleted: false,
        history: [],
        revision: 0,
      },
    ],
    suggestions: [],
    requests: [],
    notifications: [],
    logs: [],
    secondary: null,
    largeText: false,
    notify: true,
  };
}
export function readDemo(raw: string | null): Demo {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (
      s?.version === 1 &&
      [
        'people',
        'providers',
        'assignments',
        'records',
        'suggestions',
        'requests',
        'notifications',
        'logs',
      ].every((k) => Array.isArray(s[k])) &&
      s.role in roles &&
      typeof s.recipientId === 'string'
    )
      return s;
  } catch {
    /* 저장 형식이 바뀌거나 손상되면 예시 상태로 복구한다. */
  }
  return createDemo();
}
export const actorId = (s: Demo) =>
  s.role === 'provider' ? s.providerId : s.role;
export function canAccess(s: Demo, id = s.recipientId) {
  const person = s.people.find((p) => p.id === id);
  if (!person) return false;
  if (s.role === 'guardian') return true;
  if (!person.linked) return false;
  return (
    s.role === 'agency' ||
    s.assignments.some(
      (a) =>
        a.recipientId === id &&
        a.providerId === s.providerId &&
        a.active &&
        a.start <= today() &&
        (!a.end || a.end >= today()) &&
        s.providers.some((p) => p.id === a.providerId && p.active),
    )
  );
}
export type Action =
  | { type: 'session'; role: Role; providerId?: string; signedIn?: boolean }
  | { type: 'select'; id: string }
  | {
      type: 'record';
      id?: string;
      content: string;
      category: string;
      media?: string;
    }
  | { type: 'pin' | 'delete' | 'restore'; id: string }
  | { type: 'suggest'; recordId: string; content: string }
  | { type: 'review'; id: string; approve: boolean }
  | {
      type: 'assign';
      recipientId: string;
      providerId: string;
      start: string;
      end: string;
    }
  | { type: 'end'; id: string }
  | {
      type: 'profile';
      id?: string;
      name: string;
      birth: string;
      disability: string;
      note: string;
    }
  | { type: 'provider'; id?: string; name: string; active: boolean }
  | { type: 'link'; id: string; linked: boolean }
  | { type: 'transfer'; code: string }
  | { type: 'secondary'; value: Demo['secondary'] }
  | { type: 'request'; kind: 'information' | 'behavior'; content: string }
  | { type: 'respond'; id: string; response: string }
  | { type: 'relay'; id: string }
  | { type: 'settings'; name: string; largeText: boolean; notify: boolean }
  | { type: 'read'; id: string }
  | { type: 'readAll' }
  | { type: 'visit'; text: string };
const requireThat = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
export function transition(previous: Demo, action: Action): Demo {
  const s = structuredClone(previous);
  const guardian = () =>
    requireThat(s.role === 'guardian', '보호자만 사용할 수 있어요.');
  const agency = () =>
    requireThat(s.role === 'agency', '기관 담당자만 사용할 수 있어요.');
  const access = (id = s.recipientId) =>
    requireThat(canAccess(s, id), '배정된 당사자만 확인할 수 있어요.');
  const notify = (role: Role, text: string, to: string) =>
    s.notifications.unshift({ id: uid(), role, text, to, read: false });
  const log = (text: string) =>
    s.logs.unshift({
      id: uid(),
      text,
      at: new Date().toLocaleString('ko-KR'),
      role: s.role,
    });
  const record = (id: string) => {
    const r = s.records.find((r) => r.id === id);
    requireThat(r, '기록을 찾을 수 없어요.');
    access(r!.recipientId);
    return r!;
  };
  switch (action.type) {
    case 'session':
      s.role = action.role;
      s.providerId = action.providerId ?? s.providerId;
      s.signedIn = action.signedIn ?? true;
      break;
    case 'select':
      requireThat(
        s.people.some((p) => p.id === action.id),
        '당사자를 찾을 수 없어요.',
      );
      s.recipientId = action.id;
      break;
    case 'record': {
      access();
      requireThat(s.role !== 'agency', '기관은 기록을 요청해주세요.');
      requireThat(action.content.trim(), '내용을 입력해주세요.');
      requireThat(action.category in categories, '카테고리를 선택해주세요.');
      if (action.id) {
        const r = record(action.id);
        requireThat(
          r.authorId === actorId(s) && r.author === s.role && !r.deleted,
          '본인의 기록만 수정할 수 있어요.',
        );
        r.history.push(r.content);
        r.content = action.content.trim();
        r.category = action.category;
        r.media = action.media ?? r.media;
        r.revision++;
      } else
        s.records.unshift({
          id: uid(),
          recipientId: s.recipientId,
          content: action.content.trim(),
          category: action.category,
          author: s.role,
          authorId: actorId(s),
          date: today(),
          pinned: false,
          media: action.media ?? '',
          deleted: false,
          history: [],
          revision: 0,
        });
      notify(
        s.role === 'guardian' ? 'provider' : 'guardian',
        '새 기록 또는 수정된 기록이 있어요.',
        '/records',
      );
      log('생활기록 저장');
      break;
    }
    case 'pin': {
      guardian();
      const r = record(action.id);
      r.pinned = !r.pinned;
      log('중요 정보 고정 변경');
      break;
    }
    case 'delete':
    case 'restore': {
      const r = record(action.id);
      requireThat(
        r.author === s.role && r.authorId === actorId(s),
        '본인의 기록만 관리할 수 있어요.',
      );
      r.deleted = action.type === 'delete';
      log(action.type === 'delete' ? '기록 삭제' : '기록 복구');
      break;
    }
    case 'suggest': {
      const r = record(action.recordId);
      requireThat(
        s.role === 'provider' && r.author === 'guardian' && !r.deleted,
        '보호자 기록에만 제안할 수 있어요.',
      );
      requireThat(
        action.content.trim() && action.content.trim() !== r.content,
        '변경 내용을 입력해주세요.',
      );
      requireThat(
        !s.suggestions.some(
          (x) => x.recordId === r.id && x.status === 'pending',
        ),
        '검토 중인 제안이 있어요.',
      );
      s.suggestions.unshift({
        id: uid(),
        recordId: r.id,
        content: action.content.trim(),
        original: r.content,
        revision: r.revision,
        status: 'pending',
      });
      notify('guardian', '새 수정 제안이 도착했어요.', '/suggestions');
      log('수정 제안 전송');
      break;
    }
    case 'review': {
      guardian();
      const x = s.suggestions.find((x) => x.id === action.id);
      requireThat(
        x?.status === 'pending',
        '이미 처리되었거나 없는 제안이에요.',
      );
      const r = record(x!.recordId);
      if (action.approve) {
        requireThat(
          r.revision === x!.revision && !r.deleted,
          '원본이 바뀌었어요. 제안을 거절하고 다시 요청해주세요.',
        );
        r.history.push(r.content);
        r.content = x!.content;
        r.revision++;
      }
      x!.status = action.approve ? 'approved' : 'rejected';
      notify(
        'provider',
        action.approve
          ? '수정 제안이 승인되었어요.'
          : '수정 제안이 거절되었어요.',
        '/suggestions',
      );
      log('수정 제안 ' + (action.approve ? '승인' : '거절'));
      break;
    }
    case 'assign': {
      agency();
      requireThat(
        s.people.some((p) => p.id === action.recipientId && p.linked) &&
          s.providers.some((p) => p.id === action.providerId && p.active),
        '연결된 당사자와 활동 중인 지원사를 선택해주세요.',
      );
      requireThat(
        /^\d{4}-\d{2}-\d{2}$/.test(action.start) &&
          (!action.end || action.end >= action.start),
        '배정 기간을 확인해주세요.',
      );
      s.assignments
        .filter((a) => a.recipientId === action.recipientId)
        .forEach((a) => (a.active = false));
      s.assignments.unshift({ id: uid(), ...action, active: true });
      notify('provider', '새 돌봄 배정이 도착했어요.', '/home');
      notify('guardian', '담당 활동지원사가 배정되었어요.', '/relations');
      log('활동지원사 배정');
      break;
    }
    case 'end': {
      requireThat(s.role !== 'provider', '배정을 종료할 권한이 없어요.');
      const a = s.assignments.find((a) => a.id === action.id);
      requireThat(a, '배정을 찾을 수 없어요.');
      a!.active = false;
      notify('provider', '돌봄 배정이 종료되었어요.', '/home');
      log('돌봄 종료');
      break;
    }
    case 'profile': {
      guardian();
      requireThat(
        action.name.trim() &&
          action.birth &&
          action.birth <= today() &&
          action.disability,
        '기본 정보를 확인해주세요.',
      );
      if (action.id) {
        const p = s.people.find((p) => p.id === action.id);
        requireThat(p, '당사자를 찾을 수 없어요.');
        Object.assign(p!, {
          name: action.name.trim(),
          birth: action.birth,
          disability: action.disability,
          note: action.note,
        });
      } else {
        const id = uid();
        s.people.push({
          id,
          name: action.name.trim(),
          birth: action.birth,
          disability: action.disability,
          note: action.note,
          linked: false,
        });
        s.recipientId = id;
      }
      log('당사자 프로필 저장');
      break;
    }
    case 'provider': {
      agency();
      requireThat(action.name.trim(), '이름을 입력해주세요.');
      const p = s.providers.find((p) => p.id === action.id);
      if (p) {
        p.name = action.name.trim();
        p.active = action.active;
        if (!p.active)
          s.assignments
            .filter((a) => a.providerId === p.id)
            .forEach((a) => (a.active = false));
      } else
        s.providers.push({
          id: uid(),
          name: action.name.trim(),
          active: action.active,
        });
      log('활동지원사 정보 변경');
      break;
    }
    case 'link': {
      agency();
      const p = s.people.find((p) => p.id === action.id);
      requireThat(p, '고유 번호를 확인해주세요.');
      p!.linked = action.linked;
      if (!action.linked)
        s.assignments
          .filter((a) => a.recipientId === p!.id)
          .forEach((a) => (a.active = false));
      log(action.linked ? '보호자 정보 연결' : '보호자 정보 연결 해제');
      break;
    }
    case 'transfer': {
      guardian();
      requireThat(
        action.code === 'NEW002',
        '예시 기관 코드 NEW002를 입력해주세요.',
      );
      s.agency = '새봄 예시 지원센터';
      s.assignments.forEach((a) => (a.active = false));
      s.people.forEach((p) => (p.linked = false));
      notify(
        'agency',
        '기관 이전 요청이 도착했어요. 고유 번호로 연결해주세요.',
        '/agency/recipients',
      );
      log('기관 이전 및 기존 배정 해제');
      break;
    }
    case 'secondary':
      guardian();
      if (action.value)
        requireThat(
          action.value.name.trim() && action.value.contact.trim(),
          '이름과 예시 연락처를 입력해주세요.',
        );
      s.secondary = action.value;
      log('세컨드 보호자 변경');
      break;
    case 'request': {
      access();
      requireThat(
        (action.kind === 'behavior' && s.role === 'agency') ||
          (action.kind === 'information' && s.role === 'provider'),
        '요청 권한이 없어요.',
      );
      if (action.kind === 'behavior')
        requireThat(
          s.assignments.some(
            (a) =>
              a.recipientId === s.recipientId &&
              a.active &&
              a.start <= today() &&
              (!a.end || a.end >= today()),
          ),
          '현재 배정된 활동지원사가 없어요.',
        );
      else requireThat(action.content.trim(), '요청 내용을 입력해주세요.');
      s.requests.unshift({
        id: uid(),
        recipientId: s.recipientId,
        content:
          action.content.trim() || '오늘의 도전행동 관찰 내용을 기록해주세요.',
        kind: action.kind,
        status: 'pending',
        response: '',
      });
      notify(
        action.kind === 'behavior' ? 'provider' : 'guardian',
        '새 정보 요청이 도착했어요.',
        '/requests',
      );
      log('정보 요청 전송');
      break;
    }
    case 'relay': {
      agency();
      const r = s.requests.find((r) => r.id === action.id);
      requireThat(
        r?.kind === 'information' && r.status === 'pending',
        '중계할 요청이 없어요.',
      );
      r!.status = 'relayed';
      notify('guardian', '기관에서 추가 정보를 요청했어요.', '/requests');
      log('추가 정보 요청 중계');
      break;
    }
    case 'respond': {
      const r = s.requests.find((r) => r.id === action.id);
      requireThat(r, '요청이 없어요.');
      access(r!.recipientId);
      requireThat(
        (s.role === 'guardian' &&
          r!.kind === 'information' &&
          r!.status === 'pending') ||
          (s.role === 'provider' &&
            r!.kind === 'behavior' &&
            r!.status === 'pending'),
        '응답할 수 없는 요청이에요.',
      );
      requireThat(action.response.trim(), '응답을 입력해주세요.');
      r!.response = action.response.trim();
      r!.status = 'answered';
      notify('agency', '요청에 답변이 도착했어요.', '/requests');
      notify(
        r!.kind === 'behavior' ? 'guardian' : 'provider',
        '요청 답변을 확인해주세요.',
        '/requests',
      );
      log('요청 답변');
      break;
    }
    case 'settings':
      requireThat(action.name.trim(), '표시 이름을 입력해주세요.');
      s.name = action.name.trim();
      s.largeText = action.largeText;
      s.notify = action.notify;
      break;
    case 'read': {
      const n = s.notifications.find(
        (n) => n.id === action.id && n.role === s.role,
      );
      if (n) n.read = true;
      break;
    }
    case 'readAll':
      s.notifications.filter((n) => n.role === s.role).forEach((n) => (n.read = true));
      break;
    case 'visit':
      access();
      log(action.text);
      break;
  }
  return s;
}
