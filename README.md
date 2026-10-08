# [프로젝트명]

> [프로젝트 한 줄 소개]

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
