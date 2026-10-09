# FE 배포 환경 분리 & API 클라이언트 레이어 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `demo` / `main` 브랜치를 분리해 발표용·실서비스용 Vercel 배포를 독립시키고, `main`에 BE 연동을 위한 API 클라이언트 레이어를 준비한다.

**Architecture:** `demo` 브랜치는 현재 mock 상태를 고정하여 기존 Vercel 프로젝트에 배포한다. `main` 브랜치는 신규 Vercel 프로젝트에 배포하며, `src/api/client.ts`가 `VITE_API_BASE_URL`을 기반으로 BE를 호출하는 기반 레이어를 제공한다. `records.ts`는 타입과 함수 시그니처만 정의하고 BE API 완성 후 실제 연결한다.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Vercel CLI + GitHub Actions + vitest

**Spec:** `docs/superpowers/specs/2026-10-09-fe-deployment-split-api-client-design.md`

## Global Constraints

- `demo` 브랜치에는 어떤 코드 변경도 하지 않는다. 브랜치 생성 후 건드리지 않음.
- `main`의 기존 mock 데이터 페이지는 이 계획에서 수정하지 않는다.
- `VITE_*` 접두사 환경변수만 클라이언트에 노출된다 (Vite 규칙).
- `.env.local`은 기존 `.gitignore`의 `*.local` 패턴으로 이미 커버됨 — gitignore 수정 불필요.
- axios 미사용 — native fetch만 사용.
- `tsconfig.app.json`에 `noUnusedLocals: true`, `noUnusedParameters: true` 활성화 — 불필요한 import 금지.

## Review Focus

- **`VITE_API_BASE_URL` 미설정 시 BASE_URL = `''`** → fetch가 상대 경로로 요청, 로컬 Vite 개발 서버로 가서 404. Task 4 `client.test.ts`에서 BASE_URL이 경로 앞에 붙는지 확인하는 테스트 포함됨.
- **`success: false`인데 HTTP 200 응답** → `ApiError`가 code와 message를 담아 throw 돼야 함. Task 4 테스트에서 커버.
- **HTTP 4xx/5xx 응답** → `res.json()` 호출 전에 `ApiError` throw. Task 4 테스트에서 커버.
- **`VERCEL_PROJECT_ID_PROD` secret 미설정** → prod 워크플로우 실행 시 Vercel 인증 실패. 수동 작업 단계에서 명시적으로 안내.
- **기존 Vercel 프로젝트 Production Branch 미변경** → `main` push가 발표용 URL에 반영될 수 있음. Task 2 완료 후 사용자 수동 작업 체크리스트에 포함.

---

## 파일 맵

```
.github/workflows/
  deploy-frontend.yml              ← 삭제
  deploy-frontend-demo.yml         ← 신규 (demo 브랜치 → 기존 Vercel 프로젝트)
  deploy-frontend-prod.yml         ← 신규 (main 브랜치 → 신규 Vercel 프로젝트)

frontend/
  .env.local                       ← 신규 (gitignored, 로컬 개발용)
  .env.production                  ← 신규 (Vercel prod env로 덮어씌워짐)
  vite.config.ts                   ← test 설정 추가
  src/
    vite-env.d.ts                  ← 신규 (VITE_API_BASE_URL 타입)
    api/
      client.ts                    ← 신규 (base fetch 래퍼)
      client.test.ts               ← 신규 (vitest)
      records.ts                   ← 신규 (records 도메인 stub)
```

---

## Task 1: demo 브랜치 생성

**Files:**
- Git 브랜치 조작만 — 파일 변경 없음

**Interfaces:**
- Produces: `demo` 브랜치 (현재 `main` 스냅샷, mock 상태 고정)

- [ ] **Step 1: 현재 main 상태 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo"
git log --oneline -3
git status
```

Expected: 작업 트리 클린, 최신 커밋 확인

- [ ] **Step 2: demo 브랜치 생성**

```bash
git checkout -b demo
```

Expected: `Switched to a new branch 'demo'`

- [ ] **Step 3: demo 브랜치 push**

```bash
git push -u origin demo
```

Expected: Remote에 `demo` 브랜치 생성됨

- [ ] **Step 4: main으로 복귀 확인**

```bash
git checkout main
git branch
```

Expected: `* main`, `  demo` 목록 확인

---

## Task 2: CI/CD 워크플로우 분리

**Files:**
- Delete: `.github/workflows/deploy-frontend.yml`
- Create: `.github/workflows/deploy-frontend-demo.yml`
- Create: `.github/workflows/deploy-frontend-prod.yml`

**Interfaces:**
- Consumes: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (기존 GitHub Secrets)
- Produces: `VERCEL_PROJECT_ID_PROD` secret 슬롯 (사용자가 채워야 함)

- [ ] **Step 1: 기존 워크플로우 삭제**

```bash
rm "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/.github/workflows/deploy-frontend.yml"
```

- [ ] **Step 2: demo 배포 워크플로우 작성**

파일: `.github/workflows/deploy-frontend-demo.yml`

```yaml
name: Deploy Frontend (Demo)

on:
  push:
    branches: [demo]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

- [ ] **Step 3: prod 배포 워크플로우 작성**

파일: `.github/workflows/deploy-frontend-prod.yml`

```yaml
name: Deploy Frontend (Production)

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}

      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}

      - name: Deploy to production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_PROD }}
```

- [ ] **Step 4: YAML 문법 검증**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo"
python3 -c "
import yaml
for f in ['.github/workflows/deploy-frontend-demo.yml', '.github/workflows/deploy-frontend-prod.yml']:
    with open(f) as fh:
        yaml.safe_load(fh)
    print(f'{f}: OK')
"
```

Expected: 두 파일 모두 `OK`

- [ ] **Step 5: 커밋 및 push**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo"
git add .github/workflows/
git commit -m "ci: 발표용/실서비스용 Vercel 배포 워크플로우 분리"
git push origin main
```

- [ ] **Step 6: 사용자 수동 작업 안내 출력**

아래 두 가지를 사용자에게 안내한다:

```
[수동 작업 1] 신규 Vercel 프로젝트 생성 (실서비스용)
  frontend/ 디렉토리에서:
  $ vercel link  → 새 프로젝트 생성 선택
  생성 후 .vercel/project.json 의 "projectId" 값을 복사

[수동 작업 2] GitHub Secret 추가
  GitHub 레포 → Settings → Secrets and variables → Actions
  → New repository secret
  Name: VERCEL_PROJECT_ID_PROD
  Value: (위에서 복사한 projectId)

[수동 작업 3] 기존 Vercel 프로젝트 Production Branch 변경
  Vercel 대시보드 → 기존 프로젝트 → Settings → Git
  → Production Branch → demo 로 변경
  (변경 후 demo 브랜치로 수동 배포 1회 트리거 필요)
```

---

## Task 3: 환경변수 및 타입 설정

**Files:**
- Create: `frontend/.env.local`
- Create: `frontend/.env.production`
- Create: `frontend/src/vite-env.d.ts`

**Interfaces:**
- Produces: `import.meta.env.VITE_API_BASE_URL` — `string | undefined` 타입, Task 4에서 사용

- [ ] **Step 1: .env.local 생성 (로컬 개발용)**

파일: `frontend/.env.local`

```
VITE_API_BASE_URL=http://localhost:8080
```

이 파일은 `*.local` 패턴으로 기존 `.gitignore`에 이미 커버됨.

- [ ] **Step 2: .env.production 생성**

파일: `frontend/.env.production`

```
# 실제 값은 Vercel 프로젝트 Environment Variables에서 주입
VITE_API_BASE_URL=
```

- [ ] **Step 3: Vite 환경변수 타입 선언 생성**

파일: `frontend/src/vite-env.d.ts`

```typescript
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
```

`tsconfig.app.json`에 `"types": ["vite/client"]`가 있으므로 `/// <reference>` 불필요.

- [ ] **Step 4: 타입 컴파일 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npm run build 2>&1 | head -30
```

Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 5: 커밋**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo"
git add frontend/.env.production frontend/src/vite-env.d.ts
git commit -m "feat: VITE_API_BASE_URL 환경변수 및 타입 선언 추가"
```

`.env.local`은 gitignore 대상이므로 staging 제외.

---

## Task 4: API 클라이언트 레이어

**Files:**
- Modify: `frontend/vite.config.ts` (vitest test 설정 추가)
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/client.test.ts`
- Create: `frontend/src/api/records.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE_URL` (Task 3)
- Consumes: `ApiResponse<T>`, `PaginatedData<T>` from `../types/common`
- Produces:
  - `apiRequest<T>(path: string, options?: RequestOptions): Promise<T>` — client.ts
  - `ApiError` (class, extends Error) — client.ts
  - `getRecordsByDate(date: string): Promise<PaginatedData<DailyRecord>>` — records.ts
  - `createRecord(payload: CreateRecordPayload): Promise<DailyRecord>` — records.ts
  - `DailyRecord`, `CreateRecordPayload`, `RecordCategory` (types) — records.ts

- [ ] **Step 1: vitest 설치**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npm install -D vitest
```

- [ ] **Step 2: vite.config.ts에 test 설정 추가**

`frontend/vite.config.ts` 수정:

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '돌봄 서비스',
        short_name: '돌봄',
        description: '돌봄 정보 및 생활기록 서비스',
        theme_color: '#3CAB7E',
        background_color: '#f7f8fa',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: `client.test.ts` 작성 (실패하는 테스트 먼저)**

파일: `frontend/src/api/client.test.ts`

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiRequest, ApiError } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiRequest', () => {
  it('성공 응답에서 data를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { id: 1 } }), { status: 200 })
      )
    );
    const result = await apiRequest<{ id: number }>('/api/test');
    expect(result).toEqual({ id: 1 });
  });

  it('success: false 응답에서 ApiError를 throw한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '없음' } }),
          { status: 200 }
        )
      )
    );
    await expect(apiRequest('/api/test')).rejects.toThrow(ApiError);
  });

  it('success: false 응답의 ApiError는 code를 포함한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: '없음' } }),
          { status: 200 }
        )
      )
    );
    try {
      await apiRequest('/api/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe('NOT_FOUND');
    }
  });

  it('HTTP 5xx 응답에서 ApiError를 throw한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 })
      )
    );
    await expect(apiRequest('/api/test')).rejects.toThrow(ApiError);
  });

  it('POST 요청 시 body를 JSON으로 직렬화한다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/api/test', { method: 'POST', body: { key: 'value' } });
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe(JSON.stringify({ key: 'value' }));
  });

  it('path 앞에 BASE_URL이 붙는다', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: null }), { status: 200 })
    );
    vi.stubGlobal('fetch', mockFetch);
    await apiRequest('/api/path');
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/path$/);
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npx vitest run src/api/client.test.ts 2>&1 | tail -20
```

Expected: `client` 또는 `ApiError`를 찾을 수 없다는 에러로 실패

- [ ] **Step 5: `client.ts` 구현**

파일: `frontend/src/api/client.ts`

```typescript
import type { ApiResponse } from '../types/common';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`);
  }

  const data: ApiResponse<T> = await res.json() as ApiResponse<T>;

  if (!data.success) {
    throw new ApiError(data.error.code, data.error.message);
  }

  return data.data;
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npx vitest run src/api/client.test.ts
```

Expected: 6개 테스트 모두 PASS

- [ ] **Step 7: `records.ts` stub 작성**

파일: `frontend/src/api/records.ts`

```typescript
import type { PaginatedData } from '../types/common';
import { apiRequest } from './client';

export type RecordCategory = 'EMOTION' | 'SCHEDULE' | 'HEALTH' | 'MEAL' | 'SLEEP' | 'ETC';

export interface DailyRecord {
  id: number;
  category: RecordCategory;
  content: string;
  createdAt: string;
}

export interface CreateRecordPayload {
  category: RecordCategory;
  content: string;
}

export function getRecordsByDate(date: string): Promise<PaginatedData<DailyRecord>> {
  return apiRequest<PaginatedData<DailyRecord>>(
    `/api/records?date=${encodeURIComponent(date)}`
  );
}

export function createRecord(payload: CreateRecordPayload): Promise<DailyRecord> {
  return apiRequest<DailyRecord>('/api/records', { method: 'POST', body: payload });
}
```

- [ ] **Step 8: 전체 타입 컴파일 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npm run build 2>&1 | tail -10
```

Expected: 빌드 성공, 타입 에러 없음

- [ ] **Step 9: 전체 테스트 확인**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
npx vitest run
```

Expected: 6개 테스트 PASS

- [ ] **Step 10: package.json test 스크립트 추가**

`frontend/package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 11: 커밋**

```bash
cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo"
git add frontend/vite.config.ts frontend/src/api/ frontend/src/vite-env.d.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: API 클라이언트 레이어 추가 (client, records stub) 및 vitest 설정"
git push origin main
```

---

## 완료 후 사용자 수동 작업 체크리스트

코드 구현 완료 후 아래 순서로 진행해주세요:

```
[ ] 1. frontend/ 디렉토리에서 신규 Vercel 프로젝트 생성
       $ cd "/Users/User/Data/KNU/ENACTUS/PIC 2팀/repo/frontend"
       $ vercel link
       → "Set up a new Vercel Project" 선택
       → 프로젝트 이름 입력 (예: samgyeol-prod)
       → .vercel/project.json의 "projectId" 복사

[ ] 2. GitHub Secret 추가
       GitHub 레포 → Settings → Secrets and variables → Actions
       → New repository secret
       Name:  VERCEL_PROJECT_ID_PROD
       Value: (위 projectId)

[ ] 3. 기존 Vercel 프로젝트 Production Branch 변경
       Vercel 대시보드 → 기존 프로젝트(발표용) → Settings → Git
       → Production Branch: demo

[ ] 4. demo 브랜치 배포 트리거 (최초 1회)
       파일 변경 없이 demo 브랜치에 빈 커밋 push
       $ git checkout demo
       $ git commit --allow-empty -m "ci: demo 브랜치 초기 배포 트리거"
       $ git push origin demo
       $ git checkout main

[ ] 5. 신규 Vercel 프로젝트에 VITE_API_BASE_URL 환경변수 추가
       Vercel 대시보드 → 신규 프로젝트(실서비스용) → Settings → Environment Variables
       Name:  VITE_API_BASE_URL
       Value: (BE 배포 후 실제 URL)
       Environment: Production
```
