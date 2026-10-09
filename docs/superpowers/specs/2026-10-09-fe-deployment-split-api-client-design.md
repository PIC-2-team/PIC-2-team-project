# FE 배포 환경 분리 & API 클라이언트 레이어 설계

## 개요

발표용/실서비스용 Vercel 배포를 분리하고, `main` 브랜치에 BE 연동을 위한 API 클라이언트 레이어를 추가한다.

---

## 배포 구조

| 브랜치 | Vercel 프로젝트 | 용도 | 환경 |
|--------|----------------|------|------|
| `demo` | 기존 프로젝트 (`VERCEL_PROJECT_ID`) | 발표용 (mock 고정) | demo |
| `main` | 신규 프로젝트 (`VERCEL_PROJECT_ID_PROD`) | 실서비스용 | production |

### 브랜치 전략

- `demo` 브랜치: 현재 `main` 스냅샷에서 분기. mock 데이터 상태 고정. 이후 변경 없음.
- `main` 브랜치: BE 연동 코드가 올라가는 실서비스 라인.

---

## CI/CD 변경

### 삭제

- `.github/workflows/deploy-frontend.yml` (기존 단일 워크플로우)

### 추가

**`.github/workflows/deploy-frontend-demo.yml`**
- 트리거: `demo` 브랜치 push, `frontend/**` 경로
- 시크릿: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- 배포 환경: `production` (기존 Vercel 프로젝트)

**`.github/workflows/deploy-frontend-prod.yml`**
- 트리거: `main` 브랜치 push, `frontend/**` 경로
- 시크릿: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_PROD`
- 배포 환경: `production` (신규 Vercel 프로젝트)

---

## FE API 클라이언트 레이어 (`main` 브랜치 전용)

### 환경변수

| 파일 | 내용 | 용도 |
|------|------|------|
| `.env.local` | `VITE_API_BASE_URL=http://localhost:8080` | 로컬 개발 (gitignore) |
| `.env.production` | `VITE_API_BASE_URL=` (빈 값) | 실제 값은 Vercel 프로젝트 env에서 주입 |

`.env.local`은 `.gitignore`에 추가.

### 신규 파일

**`src/api/client.ts`**

`types/common.ts`의 `ApiResponse<T>` 포맷을 처리하는 base fetch 래퍼.
- `VITE_API_BASE_URL` 기반 요청
- 성공/에러 응답 분기 처리
- JWT Bearer 토큰 주입 placeholder (인증 구현 시 채움)
- axios 없이 native fetch 사용

**`src/api/records.ts`**

생활기록 도메인 API 함수 stub.
- `getRecords(date: string)` — 날짜별 기록 목록 조회
- `createRecord(payload)` — 기록 생성
- BE API 미완성 상태이므로 함수 시그니처만 정의, 내부는 `TODO` 처리

### 기존 파일 변경 없음

- `demo` 브랜치의 mock 데이터 페이지들은 건드리지 않음
- `main`의 mock 데이터도 이번 작업에서는 실제 API 호출로 교체하지 않음 (API 클라이언트 레이어 준비만)

---

## 수동 작업 (사용자 직접)

구현 완료 후 아래 작업이 필요하다.

1. **신규 Vercel 프로젝트 생성** — `frontend/` 디렉토리에서 `vercel link` 실행 (가이드 제공)
2. **`VERCEL_PROJECT_ID_PROD` GitHub Secret 추가** — 생성된 프로젝트 ID 입력
3. **기존 Vercel 프로젝트 Production Branch 변경** — Vercel 대시보드에서 `demo` 브랜치로 설정

---

## 변경 파일 목록

```
.github/workflows/
  deploy-frontend.yml              ← 삭제
  deploy-frontend-demo.yml         ← 신규
  deploy-frontend-prod.yml         ← 신규

frontend/
  .env.local                       ← 신규 (gitignore)
  .env.production                  ← 신규
  .gitignore                       ← .env.local 추가
  src/api/
    client.ts                      ← 신규
    records.ts                     ← 신규 (stub)
```

---

## 스코프 밖

- demo 브랜치 mock 데이터 수정
- 실제 API 호출로 페이지 교체 (BE API 완성 후 별도 작업)
- 인증(JWT) 구현
- BE 배포 환경 결정 (Railway / Fly.io / AWS)
