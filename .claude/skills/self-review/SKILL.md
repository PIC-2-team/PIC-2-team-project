---
name: self-review
description: Use when preparing a develop-target pull request before requesting team review in the PIC-2-team project.
---

# PR 셀프 리뷰 (삶결 팀)

## 전체 워크플로우

```
1. 리뷰 실행   → diff 수집 → 템플릿 검사 → 코드 검사
2. 코멘트 등록 → PR에 리뷰 결과 코멘트 게시
3. 수정 확인   → ❌ 항목을 사용자에게 보여주고 수정 범위 승인 요청  [❌ 항목이 있을 때만]
4. 수정 적용   → 승인된 항목만 수정 후 커밋·push                   [❌ 항목이 있을 때만]
5. 완료 코멘트 → 수정 내역 코멘트 게시                              [❌ 항목이 있을 때만]
```

판정이 ✅이면 단계 2에서 리뷰 결과 코멘트를 남기고 종료한다. 3~5 단계는 실행하지 않는다.

---

## 사전 설정

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
PR_NUM=$(gh pr view --json number -q .number)
COMMIT_COUNT=$(git rev-list --count origin/develop..HEAD)
BRANCH=$(git branch --show-current)
```

이 변수들을 이후 단계에서 재사용한다. `origin/develop`이 없으면 `git fetch origin develop` 먼저 실행.

---

## 단계 1 — 리뷰 실행

**diff 수집**
```bash
git diff origin/develop...HEAD   # 로컬
gh pr diff "$PR_NUM"             # PR 번호 있을 때
```

**브랜치 기반 확인 (체크리스트 #8)**
```bash
git log --oneline origin/develop..HEAD
```
출력이 있으면 develop 기반 ✅. 비어 있으면 develop과 동일하거나 분기점 오류.

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
| 8 | 브랜치 기반 | `develop`에서 분기 확인 (위 명령으로 검증) |

**코드 품질 검사**

| 변경 유형 | 사용 스킬 | 이유 |
|-----------|-----------|------|
| 일반 코드 변경 | `adversarial-reviewer` | 에이전트 없음 — 3-persona 분석, 블라인드스팟 검출 |
| 인증·권한·결제·외부 API 등 핵심 로직 | `/code-review medium` | 심층 다각도 분석 필요 |
| 문서·템플릿 전용 | `logic-review` | 논리 일관성·가정 감사 |

---

## 단계 2 — 리뷰 코멘트 등록

```bash
gh api "repos/$REPO/pulls/$PR_NUM/reviews" \
  --method POST \
  -f body="<리뷰 내용>" \
  -f event="COMMENT"
```

**코멘트 형식:**

```
## 셀프 리뷰 결과 (`/self-review`)

브랜치: <BRANCH> → develop | 커밋: <COMMIT_COUNT>개

### 템플릿
- ✅ PR 제목
- ✅ 연관 이슈
- ❌ 브랜치 기반 — develop이 아닌 main에서 분기됨
- ...

### 코드 품질
(결과 요약 또는 "문서 전용 — 생략")

### 판정
✅ 리뷰 요청 가능
또는
❌ 수정 필요: [항목 나열]
```

판정이 ✅이면 여기서 종료한다. 3~5 단계를 실행하지 않는다.

---

## 단계 3 — 수정 확인

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
# 수정된 파일 확인
git diff --name-only

# 수정 파일만 명시적으로 stage (git add . 사용 금지)
git add <수정한 파일 경로>

# 커밋 메시지는 실제 수정 내용을 반영해 작성
git commit -m "fix: <수정 내용 요약>"

git push origin "$BRANCH"
```

---

## 단계 5 — 완료 코멘트

```bash
gh api "repos/$REPO/pulls/$PR_NUM/reviews" \
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

---

## 리뷰어 지정

- `develop` 대상: 상대방 팀원 1인
- `develop → main` 대상: FE·BE 담당자 모두
