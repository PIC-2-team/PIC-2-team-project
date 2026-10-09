---
name: self-review
description: Use when preparing a develop-target pull request before requesting team review in the PIC-2-team project. Checks PR template completeness, code quality, and convention compliance.
---

# PR 셀프 리뷰 (삶결 팀)

리뷰 요청 전 아래 단계를 순서대로 실행한다.

## 실행 순서

```
1. diff 수집  → git diff origin/develop...HEAD  (또는 PR 번호로 gh pr diff)
2. 템플릿 검사 → 아래 체크리스트
3. 코드 검사  → /code-review low  (코드 변경이 있는 경우만)
4. 결과 출력  → 아래 출력 형식
```

## 템플릿 체크리스트

| # | 항목 | 기준 |
|---|------|------|
| 1 | PR 제목 | `타입: 한 줄 요약` 형식, 50자 이내 |
| 2 | 연관 이슈 | `Refs #번호` 또는 `없음` — `#번호` 플레이스홀더 남으면 실패 |
| 3 | 변경 목적 | 한 줄 이상 채워져 있음 |
| 4 | 변경 사항 | 실제 변경 내용 기재 |
| 5 | 검증 테이블 | 결과 열이 채워져 있음. 미실행 항목은 이유와 남은 위험 명시 |
| 6 | 릴리즈 메모 | **develop 대상**: 섹션 전체 삭제 · **main 대상**: 포함 PR·배포 확인 항목 기재 |
| 7 | 시크릿 없음 | `.env`, API 키, 비밀번호가 diff에 없음 |
| 8 | 브랜치 기반 | `develop`에서 분기 (`git log --oneline origin/develop..HEAD`) |

## 코드 품질 검사

코드 변경이 포함된 경우: `/code-review low`를 실행한다.  
중요한 로직 변경(인증, 권한, 데이터 처리)이면 `medium`으로 올린다.  
문서·템플릿 전용 PR은 생략한다.

## 출력 형식

```
## PR 셀프 리뷰 결과

브랜치: feat/xxx → develop | 커밋: N개

### 템플릿
- [x/❌] PR 제목
- [x/❌] 연관 이슈
- [x/❌] 변경 목적
- [x/❌] 변경 사항
- [x/❌] 검증 테이블
- [x/❌] 릴리즈 메모 처리
- [x/❌] 시크릿 없음
- [x/❌] develop 기반

### 코드 품질
(code-review 결과 요약 또는 "문서 전용 — 생략")

### 판정
✅ 리뷰 요청 가능
❌ 수정 필요: [항목 나열]
```

## 리뷰어 지정

- `develop` 대상: 상대방 팀원 1인
- `develop → main` 대상: FE·BE 담당자 모두
