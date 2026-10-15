# 삶결

> 발달장애인의 개인별 생활·돌봄 정보를 기록하고 새로운 돌봄 제공자에게 전달하는 플랫폼

---

## 배포

| 환경 | URL |
|------|-----|
| Production (main) | https://pic-2-team-frontend-prod.vercel.app |
| Demo | https://frontend-ivory-three-3vap7tp4lz.vercel.app |

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
