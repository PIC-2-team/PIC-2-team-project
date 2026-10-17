# 삶결

> 발달장애인의 개인별 생활·돌봄 정보를 기록하고 새로운 돌봄 제공자에게 전달하는 플랫폼

---

## 배포

### Frontend

| 환경 | URL |
|------|-----|
| Production (main) | https://pic-2-team-frontend-prod.vercel.app |
| Preview (develop) | [Deploy Frontend (dev) 실행 목록](https://github.com/PIC-2-team/PIC-2-team-project/actions/workflows/deploy-frontend-dev.yml?query=branch%3Adevelop)에서 최신 성공 실행의 배포 URL 확인 |
| Demo | https://frontend-ivory-three-3vap7tp4lz.vercel.app |

Preview URL은 실행의 `deploy` 작업 → `Deploy preview` 단계 로그에서 `Preview https://...` 항목을 확인합니다. 배포마다 URL이 달라지며, 접속 시 해당 Vercel 프로젝트에 접근 권한이 있는 계정의 로그인이 필요할 수 있습니다.

### Backend

| 환경 | URL |
|------|-----|
| Production (main) | https://backend-production-51de.up.railway.app |
| Swagger | https://backend-production-51de.up.railway.app/swagger-ui/index.html |
| Preview (PR) | PR 생성 시 Railway가 자동 발급 (Railway GitHub App 조직 권한 설정 후 활성화) |

---

## 기술 스택

| | 기술 |
|--|------|
| FE | React 19, TypeScript 6, Vite 8 |
| BE | Spring Boot, Java |

---

## 로컬 실행

### FE

```bash
cd frontend
npm install
npm run dev
```

### BE

```bash
cd backend
./gradlew bootRun
```

---

## 개발용 테스트 계정 (dev 프로파일 기동 시 자동 생성)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 돌봄 보호자 (GUARDIAN) | guardian@test.com | Test1234! |
| 활동지원사 (SUPPORT_WORKER) | worker@test.com | Test1234! |
| 기관 담당자 (INSTITUTION) | institution@test.com | Test1234! |

---

## 슈퍼 어드민 계정 (Production)

| 항목 | 값 |
|------|----|
| 이메일 | admin@samgyeol.com |
| 역할 | ADMIN |
| 비밀번호 | 팀 내부 채널로 별도 공유 |

계정은 DB에 직접 삽입해야 합니다. `backend/src/main/resources/admin-insert.sql`을 prod DB에 실행하세요.

로그인 후 `/admin` 경로로 이동하면 대시보드에 접근할 수 있습니다.

---

## API 타입 생성

BE 서버가 실행 중일 때:

```bash
cd frontend
npm run generate:api   # src/types/api.ts 자동 생성
```

---

## 문서

- [컨벤션 가이드](./CONTRIBUTING.md)
- [API 응답 포맷](https://github.com/PIC-2-team/PIC-2-team-project/wiki/API-Response-Convention)
- [BE 세팅 가이드](https://github.com/PIC-2-team/PIC-2-team-project/wiki/BE-Setup)
