# Contributing Guide

## 브랜치 전략

```
main      ← 릴리즈 (직접 push 금지)
develop   ← 통합 브랜치 (직접 push 금지)
feat/*    ← 기능 개발
fix/*     ← 버그 수정
chore/*   ← 설정, 패키지 등 기타
```

- 모든 작업은 `develop`에서 분기한다
- 작업 완료 후 `develop`으로 PR을 올린다
- `develop` → `main`은 릴리즈 시점에만 병합한다

## 브랜치 네이밍

```
feat/기능명
fix/버그명
chore/작업명
```

예시: `feat/login`, `fix/token-refresh`, `chore/eslint-config`

## 커밋 컨벤션

```
타입: 한 줄 요약
```

| 타입 | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `chore` | 설정, 패키지, 기타 |
| `style` | 포맷, 세미콜론 등 로직 변경 없음 |
| `refactor` | 리팩터링 |
| `docs` | 문서 수정 |

예시: `feat: 로그인 페이지 구현`, `fix: 토큰 만료 시 리다이렉트 오류 수정`

## PR 규칙

- 셀프 merge 금지 — 상대방 approve 1개 필수
- PR 제목은 커밋 컨벤션과 동일한 형식 사용
- 리뷰어는 24시간 내 리뷰

## API 컨벤션

[API 응답 포맷](https://github.com/PIC-2-team/PIC-2-team-project/wiki/API-Response-Convention) 참고
