---
authored_with: Claude Code
features_used:
  - superpowers:brainstorming
date: 2026-10-09
---

# ADR-002: 고령자 친화 모드 구현 방식

**상태:** 채택

---

## 배경

삶결의 주 타겟인 돌봄 보호자는 50~60대 고령층이다 (PRD 페르소나: 60대 어머니, 스마트폰 익숙하지 않음).
PRD 비기능 요구사항에 "추가 설정으로 고령자 친화 — 큰 글씨, 단순 화면, 음성 입력"이 명시되어 있다.

이 기능은 **선택적 토글**로 제공해야 한다:
- 기본값은 일반 UI (젊은 활동 지원사, 기관 담당자도 사용)
- 사용자가 원할 때 전환 가능
- 앱 재시작 후에도 설정 유지

현재 스택: React 19 + TypeScript + Vite + 순수 CSS (CSS-in-JS 없음, Tailwind 없음), PWA.

---

## 고려한 옵션

### 옵션 1: `body.senior-mode` 클래스 + CSS Custom Properties ✅ 채택

```css
/* 디자인 토큰 (기본값) */
:root {
  --font-size-body: 16px;
  --touch-target: 44px;
  --line-height: 1.5;
  --spacing-md: 12px;
  --color-text: #1a1a1a;
}

/* 고령자 모드 오버라이드 */
body.senior-mode {
  --font-size-body: 20px;
  --touch-target: 56px;
  --line-height: 1.8;
  --spacing-md: 20px;
}

body.senior-mode * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

```tsx
// Context로 전역 관리, localStorage로 영속
const SeniorModeContext = createContext({ isSenior: false, toggle: () => {} });

export function SeniorModeProvider({ children }) {
  const [isSenior, setIsSenior] = useState(
    () => localStorage.getItem('seniorMode') === 'true'
  );
  useEffect(() => {
    document.body.classList.toggle('senior-mode', isSenior);
    localStorage.setItem('seniorMode', String(isSenior));
  }, [isSenior]);
  // ...
}
```

**장점:**
- 컴포넌트 코드 변경 없음 — CSS cascade가 자동으로 모든 하위 요소에 적용
- 나중에 추가한 컴포넌트도 토큰을 쓰면 자동으로 고령자 모드 반응
- 런타임 JS overhead 없음 (순수 CSS 전환)
- CSS custom properties 도입 = 디자인 토큰 시스템 구축이 동시에 달성됨
- `localStorage`로 저장 → PWA 오프라인에서도 복원됨

**단점:**
- CSS custom properties를 처음부터 사용해야 효과 있음. 하드코딩된 `16px` 직접 사용 시 오버라이드 불가.
  → **이 제약은 "강제된 좋은 습관"**: 어차피 디자인 토큰 시스템이 필요하므로 수용

---

### 옵션 2: React Context + 조건부 className 분기

```tsx
// 모든 컴포넌트에서
const { isSenior } = useSeniorMode();
<p className={isSenior ? 'text-xl leading-loose' : 'text-base leading-normal'}>
```

**장점:** TypeScript 타입 안전, 컴포넌트 단위 테스트 용이

**단점:**
- **모든 컴포넌트**가 Context를 소비하고 분기를 작성해야 함 → 오염 범위가 넓음
- 신규 컴포넌트 작성 시 빠뜨리기 쉬움 → 일관성 깨짐
- 리뷰 시 각 컴포넌트가 senior-mode를 올바르게 처리하는지 개별 확인 필요
- 옵션 1 대비 유지보수 비용이 상수배로 높음

→ **기각**: 분기가 코드베이스 전체에 확산되어 유지보수 부담이 큼

---

### 옵션 3: 별도 라우트 세트 (`/senior/*`)

고령자 전용 페이지를 별도로 만든다.

**단점:**
- 모든 페이지 코드가 두 배가 됨
- 비즈니스 로직과 API 연동을 각 세트마다 동기화해야 함

→ **기각**: 명백한 코드 중복, 유지보수 불가

---

### 옵션 4: OS 수준 접근성 설정만 대응 (`@media prefers-*`)

```css
@media (prefers-reduced-motion: reduce) { /* ... */ }
@media (prefers-contrast: more)         { /* ... */ }
```

**장점:** 추가 구현 없음

**단점:**
- 50~60대 사용자가 OS 설정을 직접 변경하는 것은 높은 장벽
- Android Chrome에서 `prefers-contrast` 지원이 불안정함
- 앱 내에서 한 번에 켤 수 없음

→ **보조 수단으로만 채택**: 옵션 1과 OR 관계로 병행

---

## 결정

**옵션 1 채택**: `body.senior-mode` 클래스 교체 + CSS Custom Properties

이유:
1. **컴포넌트 영향 없음**: 신규 컴포넌트를 추가해도 토큰만 쓰면 자동 반응
2. **현 스택에 최적**: 순수 CSS 환경에서 CSS-in-JS나 Tailwind 없이 구현 가능한 가장 자연스러운 방식
3. **디자인 토큰 구축 강제**: 하드코딩 방지, 추후 테마 확장(다크 모드 등)에도 동일 구조 재사용 가능
4. **PWA 오프라인 호환**: localStorage → 서비스 워커와 무관하게 설정 복원

보조로 OS 미디어 쿼리(`prefers-reduced-motion`, `prefers-contrast`)도 함께 적용해 이중 보호.

---

## 구현 제약

- 모든 CSS에서 픽셀·색상 직접 사용 금지. 반드시 CSS custom properties 경유:
  ```css
  /* ❌ */  font-size: 16px;
  /* ✅ */  font-size: var(--font-size-body);
  ```
- 설정 진입점: 마이페이지(`/more`) 최상단에 "큰 글씨 모드" 토글 — 1회 터치로 접근

---

## 파생 설계 원칙 (기본 UI에 적용)

고령자 친화 모드 연구 과정에서 도출된 아래 5가지 원칙은 **토글 여부와 무관하게 기본 UI 전체에 적용**한다.
근거: 삶결의 주 타겟(보호자 50~60대)이 기본 모드에서도 동일하게 사용하기 때문이다.

### 1. 버튼은 반드시 명확한 사각형 형태

**바뀌는 것:** 텍스트 링크, `>` 화살표 단독 사용 금지.

```
❌  전체보기 >          ✅  [ 전체보기 ]
❌  더보기               ✅  [ 더보기    ]
```

- 50~60대는 밑줄 없는 텍스트와 `>` 기호가 클릭 가능하다는 것을 직관적으로 인식하지 못함
- 레퍼런스 이미지의 `전체보기 >` 패턴은 보조 텍스트에만 허용, 단독 CTA로는 사용 금지

### 2. 스크롤 가능 여부 시각적 힌트

**바뀌는 것:** 스크롤이 필요한 화면은 하단 콘텐츠가 잘린 형태로 표시해 더 있음을 암시.

```
┌──────────────┐
│  카드 1      │
│  카드 2      │
│  카드 3 (반만│  ← 의도적으로 절반만 노출
└──────────────┘
```

- 스크롤 indicator(스크롤바)에 의존하지 않음 — 모바일 PWA에서 기본적으로 숨겨짐
- 긴 목록 화면(`/records`, `/care-info` 카테고리 내부)에 적용

### 3. 뒤로가기 항상 노출

**바뀌는 것:** 하위 화면(기록 상세, 기록 작성, 설정 하위 등) 헤더에 뒤로가기 버튼 필수 배치.

- 스와이프 제스처에 의존하지 않음 (기기마다 동작 다름, 고령층 인지 어려움)
- 파괴적 액션(기록 삭제, 돌봄 종료 등)은 2단계 확인 모달 추가

### 4. 음성 입력(M6) 기본 진입점에 배치

**바뀌는 것:** `/records/new` 기록 작성 화면에서 음성 입력이 텍스트 입력과 동등한 레벨로 배치.

```
┌──────────────────────────┐
│  [ 🎙 음성으로 기록하기 ] │  ← 텍스트 입력과 동등한 크기
│  [ ✏️ 직접 입력하기     ] │
└──────────────────────────┘
```

- 연구 결과: 50~60대가 텍스트 입력보다 음성 입력을 선호하는 경향이 가장 강함
- 음성 버튼을 하단 FAB나 보조 아이콘으로 숨기지 않음

### 5. 한 화면 = 한 가지 정보 원칙

**바뀌는 것:** 여러 입력이 필요한 플로우는 스텝 분리.

| 대상 화면 | 기존 가정 | 변경 후 |
|-----------|-----------|---------|
| 당사자 등록 | 한 화면에 전체 입력 | 기본정보 → 장애유형 → 완료 스텝 분리 |
| 기록 작성 | 입력 + 카테고리 선택 동시 | 입력 → AI 카테고리 확인 2단계 |
| 활동 지원사 배정 (기관) | 한 화면 | 당사자 선택 → 지원사 선택 → 기간 설정 3단계 |

---

## 결과

- 컴포넌트 코드 변경 없이 전역 UI 전환 가능
- CSS 토큰 시스템이 프로젝트 초기부터 확립됨
- 향후 다크 모드 등 추가 테마는 동일 패턴(`:root` 변수 오버라이드)으로 확장
- 위 5가지 원칙은 와이어프레임, 컴포넌트 구현, PR 리뷰 체크리스트로 활용
