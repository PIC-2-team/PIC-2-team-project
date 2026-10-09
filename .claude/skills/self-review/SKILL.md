---
name: self-review
description: Use when preparing a develop-target pull request before requesting team review in the PIC-2-team project. Checks PR template completeness, code quality, and convention compliance.
---

# PR 셀프 리뷰 (삶결 팀)

## 전체 워크플로우

```
1. 리뷰 실행   → diff 수집 → 템플릿 검사 → 코드 검사
2. 코멘트 등록 → PR에 리뷰 결과 코멘트 게시
3. 수정 확인   → ❌ 항목을 사용자에게 보여주고 수정 범위 승인 요청
4. 수정 적용   → 승인된 항목만 수정 후 커밋·push
5. 완료 코멘트 → PR에 반영 완료 코멘트 게시
```

판정이 ✅이면 3~4 단계를 건너뛰고 5로 이동한다.

---

## 단계 1 — 리뷰 실행

**diff 수집**
```bash
git diff origin/develop...HEAD          # 로컬 브랜치
gh pr diff <PR번호>                      # PR 번호가 있을 때
```

**템플릿 체크리스트**

| # | 항목 | 기준 |
|---|------|------|
| 1 | PR 제목 | `타입: 한 줄 요약` 형식, 50자 이내 |
| 2 | 연관 이슈 | `Refs #번호` 또는 `없음` — `#번호` 플레이스홀더 남으면 ❌ |
| 3 | 변경 목적 | 한 줄 이상 채워져 있음 |
| 4 | 변경 사항 | 실제 변경 내용 기재 |
| 5 | 검증 체크박스 | 체크된 항목에 결과 기재. 미실행은 이유와 남은 위험 명시 |
| 6 | 템플릿 선택 | develop 대상: `default` · main 대상: `release` |
| 7 | 시크릿 없음 | `.env`, API 키, 비밀번호가 diff에 없음 |
| 8 | 브랜치 기반 | `develop`에서 분기 확인 |

**코드 품질 검사**

코드 변경 포함 시 `/code-review low` 실행.
중요 로직(인증·권한·데이터 처리)은 `medium`으로 올린다.
문서·템플릿 전용 PR은 생략한다.

---

## 단계 2 — 리뷰 코멘트 등록

리뷰 결과를 아래 형식으로 PR에 코멘트한다.

```bash
gh api repos/PIC-2-team/PIC-2-team-project/pulls/<PR번호>/reviews \
  --method POST \
  -f body="<리뷰 내용>" \
  -f event="COMMENT"
```

**코멘트 형식:**

```
## 셀프 리뷰 결과 (`/self-review`)

브랜치: feat/xxx → develop | 커밋: N개

### 템플릿
- [x] PR 제목
- [x] 연관 이슈
- ...

### 코드 품질
(결과 요약 또는 "문서 전용 — 생략")

### 판정
✅ 리뷰 요청 가능  또는  ❌ 수정 필요: [항목 나열]
```

---

## 단계 3 — 수정 확인 (❌ 항목이 있을 때만)

❌ 항목 목록과 제안 수정안을 사용자에게 보여주고 **명시적 승인을 받는다**.

```
수정 필요 항목:
1. [항목명] — [현재 상태] → [제안 수정]
2. ...

위 항목을 수정하고 push하겠습니다. 진행할까요?
```

승인 없이 수정하지 않는다.

---

## 단계 4 — 수정 적용

승인된 항목만 수정 후 커밋·push한다.

```bash
git add <파일>
git commit -m "fix: 셀프 리뷰 지적 사항 수정"
git push origin <브랜치명>
```

---

## 단계 5 — 완료 코멘트

수정 완료 후 PR에 반영 결과를 코멘트한다.

```bash
gh api repos/PIC-2-team/PIC-2-team-project/pulls/<PR번호>/reviews \
  --method POST \
  -f body="<완료 내용>" \
  -f event="COMMENT"
```

**완료 코멘트 형식:**

```
## 셀프 리뷰 반영 완료

### 수정 내역
| 항목 | 수정 내용 |
|------|----------|
| [항목명] | [적용한 변경] |

### 판정
✅ 리뷰 요청 가능 — 리뷰어 지정 후 Ready for review로 전환합니다.
```

판정 ✅였거나 수정 없이 통과된 경우:

```
셀프 리뷰 완료 — 모든 항목 통과. 리뷰 요청합니다.
```

---

## 리뷰어 지정

- `develop` 대상: 상대방 팀원 1인
- `develop → main` 대상: FE·BE 담당자 모두
