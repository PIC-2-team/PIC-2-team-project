# 백엔드 CI/CD 파이프라인 구축 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spring Boot 백엔드에 GitHub Actions CI + Railway CD를 연결해 main 머지 시 자동 배포되는 파이프라인을 구축한다.

**Architecture:** GitHub Actions가 CI(빌드+테스트)를 담당하고, Railway가 CI 통과 후 자동으로 CD(빌드+배포)를 수행한다. 테스트는 H2 인메모리 DB로 실행되므로 외부 DB 없이 CI가 동작한다.

**Tech Stack:** Spring Boot 4.1.1, Java 21, Gradle, GitHub Actions, Railway (Nixpacks), MySQL (Railway Plugin)

**Spec:** `docs/superpowers/specs/2026-10-15-backend-cicd-design.md`

## Global Constraints

- Java 21, Spring Boot 4.1.1, Gradle
- 테스트는 반드시 `dev` 프로파일(H2)로 실행 — prod 시크릿을 CI에 넣지 않는다
- `/actuator/health`는 인증 없이 접근 가능해야 한다 (Railway 헬스체크용)
- `backend/` 하위에 Procfile을 두어 Railway 시작 커맨드를 코드로 관리한다
- JAR 이름: `backend-0.0.1-SNAPSHOT.jar` (`settings.gradle`의 `rootProject.name = 'backend'`, `version = '0.0.1-SNAPSHOT'`에서 결정)

## Review Focus

- `SPRING_PROFILES_ACTIVE` 환경변수가 Railway에 설정되지 않으면 `dev` 프로파일로 기동 → H2 접속 시도 → 기동 실패
- `/actuator/health`가 Security permitAll에 없으면 Railway 헬스체크가 401을 받고 배포 실패 판정
- CI에서 `./gradlew test` 실행 시 `@SpringBootTest` 컨텍스트 로딩에 OAuth2 관련 프로퍼티가 없어도 SecurityConfig가 `oauth2Login()`을 설정하지 않으므로 통과 — 단, OAuth2 자동구성이 변경되면 실패 가능
- Gradle 캐시가 없는 첫 CI 실행은 의존성 다운로드로 인해 느릴 수 있음 (actions/cache로 완화)
- Railway MySQL Plugin 연결 후 `DB_HOST` 등 환경변수가 자동 주입되지만, `SPRING_PROFILES_ACTIVE=prod`가 없으면 dev 프로파일의 H2로 덮어써짐

---

## Task 1: Actuator 의존성 추가

> **현재 develop 브랜치에는 Spring Security가 없으므로** `/actuator/health`는 별도 설정 없이 공개 접근됩니다.
> Security 관련 feature 브랜치(SecurityConfig 포함)가 develop에 머지될 때 `requestMatchers`에 `/actuator/health`를 추가해야 합니다.

**Files:**
- Modify: `backend/build.gradle` (dependencies 블록)

**Interfaces:**
- Produces: `GET /actuator/health` → `{"status":"UP"}` (인증 없이 200 반환)

- [ ] **Step 1: build.gradle에 actuator 의존성 추가**

`dependencies` 블록의 `implementation 'org.springframework.boot:spring-boot-starter-webmvc'` 아래에 추가:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

- [ ] **Step 2: 컴파일 확인**

```bash
cd backend
./gradlew build -x test
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: 커밋**

```bash
git add backend/build.gradle
git commit -m "chore: add spring-boot-starter-actuator for Railway healthcheck"
```

---

## Task 2: Railway 시작 커맨드 Procfile 추가

**Files:**
- Create: `backend/Procfile`

**Interfaces:**
- Produces: Railway가 Procfile을 감지해 `java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`를 실행

- [ ] **Step 1: Procfile 생성**

`backend/Procfile` (확장자 없음):

```
web: java -jar build/libs/backend-0.0.1-SNAPSHOT.jar
```

- [ ] **Step 2: 커밋**

```bash
git add backend/Procfile
git commit -m "chore: add Procfile for Railway start command"
```

---

## Task 3: GitHub Actions CI 워크플로우 작성

**Files:**
- Create: `.github/workflows/ci-backend.yml`

**Interfaces:**
- Produces: PR 또는 push 시 `ci / test` job 실행 → Railway "Require CI to pass" 연동 가능

- [ ] **Step 1: 워크플로우 파일 작성**

`.github/workflows/ci-backend.yml`:

```yaml
name: CI Backend

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    branches: [main, develop]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Cache Gradle packages
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('backend/**/*.gradle*', 'backend/**/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      - name: Build (compile check)
        run: ./gradlew build -x test
        working-directory: backend

      - name: Run tests
        run: ./gradlew test
        working-directory: backend
        env:
          SPRING_PROFILES_ACTIVE: dev

      - name: Upload test report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: backend/build/reports/tests/test/
```

- [ ] **Step 2: 커밋**

```bash
git add .github/workflows/ci-backend.yml
git commit -m "ci: add backend CI workflow for GitHub Actions"
```

- [ ] **Step 3: CI 동작 확인**

이 브랜치를 push한 뒤 GitHub → Actions 탭에서 `CI Backend` 워크플로우가 실행되고 `test` job이 통과하는지 확인한다.

Expected: ✅ `CI Backend` / `test` — passed

---

## Task 4: Railway 프로젝트 설정 (수동 체크리스트)

> 이 Task는 Railway 대시보드에서 수행하는 수동 작업이다. 코드 변경 없음.

**Prerequisites:** Task 1~3 완료 후 해당 브랜치가 main에 머지된 상태

- [ ] **Step 1: Railway 프로젝트 생성**

  1. [railway.app](https://railway.app) → New Project
  2. "Deploy from GitHub repo" 선택
  3. `PIC-2-team/PIC-2-team-project` 저장소 선택
  4. "Add variables later" 선택 → 프로젝트 생성

- [ ] **Step 2: 서비스 루트 디렉토리 설정**

  1. 생성된 서비스 클릭 → Settings
  2. **Root Directory** → `backend` 입력 후 저장

- [ ] **Step 3: MySQL Plugin 추가 및 변수 매핑**

  1. 프로젝트 대시보드 → `+ New` → Database → MySQL 선택
  2. 백엔드 서비스 Variables에 MySQL 변수를 `application-prod.yaml`이 기대하는 이름으로 매핑:
     ```
     DB_HOST     = ${{MySQL.MYSQLHOST}}
     DB_PORT     = ${{MySQL.MYSQLPORT}}
     DB_NAME     = ${{MySQL.MYSQLDATABASE}}
     DB_USERNAME = ${{MySQL.MYSQLUSER}}
     DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
     ```
     (`${{서비스명.변수명}}` 문법으로 Railway 서비스 간 변수 참조)

- [ ] **Step 4: 나머지 환경변수 설정**

  백엔드 서비스 Variables에 추가:

  ```
  SPRING_PROFILES_ACTIVE  = prod
  JWT_SECRET              = <openssl rand -base64 64 로 생성한 값>
  CORS_ALLOWED_ORIGINS    = https://<Vercel 프론트엔드 도메인>
  AWS_ACCESS_KEY_ID       = <IAM 키>
  AWS_SECRET_ACCESS_KEY   = <IAM 시크릿>
  AWS_REGION              = ap-northeast-2
  S3_BUCKET_NAME          = <버킷명>
  OPENAI_API_KEY          = <OpenAI 키>
  ```

  JWT_SECRET 생성:
  ```bash
  openssl rand -base64 64
  ```

- [ ] **Step 5: 헬스체크 설정**

  백엔드 서비스 Settings → Deploy:
  - **Healthcheck Path**: `/actuator/health`
  - **Healthcheck Timeout**: `60` (초)

- [ ] **Step 6: CI 통과 요구 설정**

  백엔드 서비스 Settings → Deploy:
  - **Wait for CI checks to pass** 활성화

- [ ] **Step 7: 첫 배포 실행 및 검증**

  1. Railway 대시보드 → "Deploy Now" (또는 main push로 자동 트리거)
  2. 빌드 로그에서 `Started BackendApplication` 메시지 확인
  3. Railway 할당 도메인으로 헬스체크 확인:
     ```
     https://<railway-domain>/actuator/health
     ```
     Expected: `{"status":"UP"}`
  4. Swagger UI 접속 확인:
     ```
     https://<railway-domain>/swagger-ui
     ```

- [ ] **Step 8: 프론트엔드 API URL 업데이트**

  Railway 도메인 확인 후 `frontend/.env.production`의 API URL 업데이트 (별도 PR).
