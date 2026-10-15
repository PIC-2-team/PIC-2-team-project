# 백엔드 배포 및 CI/CD 파이프라인 설계

**날짜:** 2026-10-15  
**대상:** Spring Boot 백엔드 (Java 21, Gradle)  
**목적:** 실제 사용자 대상 프로덕션 배포 + main 브랜치 연동 CI/CD

---

## 1. 아키텍처 개요

```
GitHub (main 브랜치)
    │
    ├─ push / PR merge
    │
    ▼
GitHub Actions (CI)
    │  ① Gradle 빌드 + 테스트
    │  ② 실패 시 배포 차단
    │
    ▼
Railway (CD)
    ├─ Spring Boot JAR 실행 (Buildpack, Docker 불필요)
    └─ MySQL Plugin (같은 프로젝트 내, 연결 변수 자동 주입)

(별도 서비스, 변경 없음)
    ├─ AWS S3 — 미디어 스토리지
    ├─ OpenAI API — AI 기능
    └─ Vercel — 프론트엔드
```

**역할 분리:**
- GitHub Actions: CI 전담 (빌드 + 테스트)
- Railway: CD 전담 (빌드·배포, CI 통과 후에만 진행)

---

## 2. GitHub Actions CI 파이프라인

**파일:** `.github/workflows/ci-backend.yml`

**트리거:**
- `main` / `develop` push (backend/** 경로 변경 시)
- `main` / `develop` 대상 PR open / update

**단계:**

```
1. Java 21 + Gradle 캐시 세팅
2. ./gradlew build -x test     # 컴파일 검증
3. ./gradlew test               # 단위/통합 테스트 (H2 인메모리 DB)
4. 실패 시 테스트 리포트 업로드
```

**결정 사항:**
- 테스트는 `dev` 프로파일(H2)으로 실행 → 외부 DB 불필요, prod 시크릿 Actions에 불필요
- Railway의 "Require CI to pass" 옵션 활성화 → CI 실패 시 배포 자동 차단
- PR에서도 CI 실행 → main 머지 전 검증 가능

---

## 3. 환경변수 및 시크릿 관리

### Railway 환경변수 (Railway 대시보드 설정)

| 변수 | 비고 |
|------|------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | MySQL plugin 연결 시 Railway 자동 주입 |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JWT_SECRET` | 직접 생성 후 입력 |
| `CORS_ALLOWED_ORIGINS` | Vercel 프론트엔드 URL |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 접근용 IAM 키 |
| `AWS_REGION` | `ap-northeast-2` |
| `S3_BUCKET_NAME` | 버킷명 |
| `OPENAI_API_KEY` | OpenAI 키 |

### GitHub Actions Secrets

- CI 테스트가 H2로 실행되므로 DB·prod 시크릿 불필요
- 테스트에서 JWT/OAuth 실제 값이 필요한 경우에만 최소한으로 추가

### 원칙
- `.env` 파일 커밋 금지 (`.gitignore` 확인 필요)
- prod 시크릿은 Railway 대시보드에만 존재

---

## 4. 배포 흐름 및 롤백

### 정상 배포 흐름

```
PR 생성
  → GitHub Actions CI (테스트)
  → 코드 리뷰 + main 머지
  → Railway가 main push 감지 → 빌드 시작
  → 새 컨테이너 기동 → 헬스체크 통과
  → 트래픽 전환 (무중단) → 이전 컨테이너 종료
```

### 롤백

- Railway 대시보드 배포 히스토리에서 이전 버전 클릭 → 즉시 롤백
- 헬스체크 실패 시 Railway가 자동으로 이전 배포 유지

### 헬스체크

- `spring-boot-starter-actuator` 의존성 추가 필요
- Railway 헬스체크 경로: `/actuator/health`

### DB 마이그레이션

- 현재 `ddl-auto: validate` + `db/manual/` SQL 수동 실행 방식 유지
- 향후 트래픽·팀 규모 증가 시 Flyway 도입 고려 (이번 범위 밖)

---

## 5. 구현 범위

### 이번 작업

- [ ] `spring-boot-starter-actuator` 의존성 추가
- [ ] `SecurityConfig`에 `/actuator/health` permitAll 추가
- [ ] `backend/Procfile` 추가 (Railway 시작 커맨드)
- [ ] `.github/workflows/ci-backend.yml` 작성
- [ ] Railway 프로젝트 생성 + MySQL plugin 연결
- [ ] Railway 환경변수 설정
- [ ] Railway "Require CI to pass" 옵션 활성화
- [ ] 첫 배포 검증 (`/actuator/health` 확인)

### 이번 범위 밖

- Flyway 마이그레이션 자동화
- 스테이징 환경 분리
- 모니터링/알림 설정 (Railway 기본 로그로 대체)
