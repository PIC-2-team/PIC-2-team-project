---
authored_with: Claude Code
features_used:
  - documentation-and-adrs
date: 2026-10-19
---

# ADR-006: BE 배포 플랫폼 선택

**상태:** 채택

---

## 배경

Spring Boot 4.1.1 + Java 21 앱인 삶결 BE를 배포할 플랫폼을 선정해야 한다. FE는 ADR-001에서 Vercel로 확정됐으나, Vercel은 정적 사이트·Node.js Serverless에 특화된 플랫폼으로 JVM 앱 배포를 지원하지 않아 BE는 별도 플랫폼이 필요했다.

요구 조건:
- JVM(Java 21) 장기 실행 프로세스 호스팅
- GitHub 연동 자동 배포 (CI 파이프라인이 이미 GitHub Actions로 구성됨)
- 환경 변수 관리 (DB, JWT 시크릿, OpenAI API 키, S3 자격증명)
- 무료 또는 저비용 (MVP 단계)

---

## 고려한 옵션

### Railway

| 항목 | 내용 |
|------|------|
| 비용 | Hobby 플랜 $5/월 (무료 크레딧 제공) |
| JVM 지원 | Nixpacks로 Gradle 자동 감지·빌드 |
| 배포 트리거 | GitHub 브랜치 push 자동 배포 |
| PR 미리보기 | GitHub App 조직 권한 설정 후 PR별 환경 자동 발급 |
| 환경 변수 | 대시보드에서 관리, 서비스별 격리 |
| 로그 | 실시간 스트리밍 및 과거 로그 조회 |

**장점:** 설정 최소화. `Procfile` 한 줄(`web: java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`)로 배포 동작. 인프라 관리 없이 즉시 시작 가능.

**단점:** 무료 티어가 없고 일시 정지 기능도 제한적. 트래픽 증가 시 비용 예측이 Vercel 대비 불명확.

---

### Fly.io

| 항목 | 내용 |
|------|------|
| 비용 | 소형 VM 무료 티어 있음 |
| JVM 지원 | Dockerfile 직접 작성 필요 |
| 배포 트리거 | `flyctl deploy` CLI 또는 GitHub Actions 직접 구성 필요 |

**단점:** Dockerfile 작성 및 `fly.toml` 설정 추가 필요. 팀에 Docker 경험이 없으면 초기 설정 부담이 큼. Railway 대비 설정 복잡도 높음.

---

### Render

| 항목 | 내용 |
|------|------|
| 비용 | 무료 티어 있음 (15분 비활성 시 슬립) |
| JVM 지원 | Gradle 자동 감지 지원 |
| 배포 트리거 | GitHub 연동 자동 배포 |

**단점:** 무료 티어는 비활성 15분 후 슬립 → 콜드 스타트 30~60초 발생. JVM 앱은 콜드 스타트가 특히 길어 개발·테스트 경험 저하. 유료 플랜은 Railway와 비슷한 비용.

---

### AWS EC2 / ECS

| 항목 | 내용 |
|------|------|
| 비용 | t3.micro 프리 티어 1년, 이후 ~$10/월 |
| 제어 수준 | 최대 (OS, 네트워크, 스케일링 직접 관리) |

**단점:** 인프라 관리 직접 담당(패치, 모니터링, 오토스케일링). MVP 단계 소규모 팀에 운영 부담이 과도함. S3·RDS와 동일 AWS 계정으로 통합 시 IAM 설정 복잡도 증가.

---

## 결정

**Railway** — Nixpacks가 Gradle 프로젝트를 자동 감지하고, `Procfile` 한 줄로 배포가 완성된다. GitHub 연동 자동 배포로 별도 deploy 워크플로우 없이 `main` 브랜치 push 시 프로덕션에 반영된다. 팀 규모와 MVP 단계 운영 부담을 고려할 때 설정·유지 비용이 가장 낮다.

CI는 GitHub Actions(ci-backend-prod.yml, ci-backend-dev.yml)에서 테스트·빌드 검증을 담당하고, 배포는 Railway가 독립적으로 처리한다.

---

## 결과

- 프로덕션 URL: `https://backend-production-51de.up.railway.app`
- Swagger: `https://backend-production-51de.up.railway.app/swagger-ui/index.html`
- PR 미리보기: Railway GitHub App의 조직 권한 설정 후 PR별 환경 자동 발급 (현재 설정 필요)
- 환경 변수: Railway 대시보드에서 관리 (`OPENAI_API_KEY`, `JWT_SECRET`, `DB_*`, `AWS_*` 등)
- 빌드: Railway가 `backend/` 디렉토리의 Gradle 래퍼를 자동 감지하여 빌드
- 프로세스: `Procfile`의 `web: java -jar build/libs/backend-0.0.1-SNAPSHOT.jar`

### 전환 트리거

다음 중 하나 발생 시 플랫폼 재검토:
- 월 비용이 $50 초과
- 99.9% 이상 SLA가 필요한 계약 체결
- 트래픽이 Railway 단일 인스턴스 한계에 도달
