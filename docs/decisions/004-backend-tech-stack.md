---
authored_with: Claude Code
features_used:
  - logic-review
  - documentation-and-adrs
date: 2026-10-14
---

# ADR-004: 백엔드 기술 스택 확정

**상태:** 채택

---

## 배경

Spring Boot 4.1.1 + Java 21 + Lombok + springdoc-openapi는 초기 세팅에서 확정됐다. 이 ADR은 그 외 선택지가 남아 있던 네 가지 결정을 기록한다.

- 프로덕션 DB
- Refresh Token 저장 위치
- AI 기능 (음성→기록 초안 생성, `POST /api/ai/record-drafts`)
- 파일 스토리지 (사진·영상·음성, 최대 50MB)

---

## 결정 1 — DB: MySQL

### 고려한 옵션

**MySQL**
- 이미 Architecture 문서에 기재됨 — 팀 합의 선행 존재
- Spring Boot + JPA 생태계에서 가장 검증된 조합
- AWS RDS, PlanetScale 등 관리형 서비스 다수

**PostgreSQL**
- JSONB 타입으로 `CARE_INFO.content` 같은 반정형 데이터 처리 유리
- 전문 검색, 배열 타입 등 고급 기능 풍부
- Architecture 문서의 기존 합의와 다름

### 결정

**MySQL** — Architecture 문서에서 팀이 이미 합의한 사항을 유지한다. CARE_INFO.content는 JPA `@Column(columnDefinition = "TEXT")`나 JSON 타입으로 충분히 처리 가능하다. PostgreSQL로의 전환 이점이 현재 단계에서는 전환 비용을 정당화하지 않는다.

### 결과

- Spring Data JPA + Hibernate + MySQL Connector/J 추가
- 개발 환경은 H2 인메모리 유지 (스키마 검증용)
- 프로덕션 환경은 MySQL 8.x

---

## 결정 2 — Refresh Token 저장: DB 테이블

### 고려한 옵션

**DB 테이블 (`refresh_tokens`)**
- 별도 인프라 없이 즉시 구현 가능
- 토큰 강제 만료(로그아웃, 탈취 대응), 활성 세션 목록 조회 가능
- 요청당 DB 조회 1회 추가 (access token 유효 시 발생 안 함)

**Redis**
- TTL 자동 처리, 조회 빠름
- Redis 인프라 추가 필요 (복잡도 증가, 비용 발생)
- MVP 단계에서 운영 부담

### 결정

**DB 테이블** — API Spec이 정의한 30일 TTL과 HttpOnly Secure Cookie 방식은 DB 기반으로 충분히 구현된다. Redis가 유리한 트래픽 규모(수천 RPS)에 도달하기 전까지는 불필요한 인프라다.

### 전환 트리거

월 활성 사용자 1,000명 초과 또는 DB refresh token 조회가 p95 지연 병목으로 확인될 때 Redis 전환을 검토한다.

### 결과

- `refresh_tokens(id, user_id, token_hash, expires_at, revoked_at, created_at)` 테이블 추가
- 로그아웃 시 `revoked_at` 업데이트로 즉시 무효화
- 만료 토큰은 배치로 정리하거나 TTL 인덱스로 관리

---

## 결정 3 — AI 서비스: OpenAI

### 고려한 옵션

**OpenAI (Whisper + GPT-4o)**
- Whisper: 한국어 포함 다국어 STT, 음성 파일 → 텍스트 변환
- GPT-4o: 변환된 텍스트를 카테고리 분류 + 일지 형태로 정리
- 두 기능을 단일 공급자로 통합 가능
- `POST /api/ai/record-drafts`의 `inputType=AUDIO`·`TEXT` 모두 처리 가능

**Claude API**
- 텍스트 이해·생성 품질 우수
- STT 기능 없음 — 음성 입력에 별도 STT 서비스 필요 (공급자 추가)
- `inputType=AUDIO` 처리 시 복잡도 증가

**MVP 제외**
- PRD Must 항목(M6)이므로 제외 불가

### 결정

**OpenAI** — Whisper + GPT-4o 조합으로 STT와 텍스트 처리를 단일 공급자에서 해결한다. 공식 Java SDK(`com.openai:openai-java`)를 사용한다.

### 결과

- `POST /api/ai/record-drafts`: Whisper로 음성 전사 후 GPT-4o로 카테고리 분류 및 초안 생성
- API 키는 환경 변수 `OPENAI_API_KEY`로 관리
- 음성 입력 최대 10분 제한은 Whisper 파일 크기 제한(25MB)과 함께 검증 필요

---

## 결정 4 — 파일 스토리지: AWS S3

### 고려한 옵션

**AWS S3**
- PRD에서 명시적으로 거론된 선택지
- JPEG/PNG/WebP/MP4/MP3/M4A/WAV/WebM 50MB 제한에 적합
- Presigned URL로 클라이언트 직접 업로드 또는 서버 프록시 방식 선택 가능
- 다운로드 URL 5분 만료(`GET /api/.../media/{id}/download-url`)와 자연스럽게 매핑

**로컬 파일 시스템**
- 개발 환경 빠른 시작 가능
- 배포 환경에서 재시작 시 파일 유실, 수평 확장 불가

### 결정

**AWS S3** — 개발 환경에서도 S3를 사용한다 (LocalStack으로 로컬 에뮬레이션 가능). AWS SDK v2(`software.amazon.awssdk:s3`)를 사용하고, 서버가 파일을 받아 S3에 업로드하는 프록시 방식으로 구현한다 (클라이언트가 S3 자격증명에 직접 접근하지 않도록).

### 결과

- 버킷 접근 권한: 비공개 (Presigned URL로만 접근)
- 다운로드 URL 만료: 5분 (API Spec 기준)
- 파일 경로: `media/{careRecipientId}/{mediaId}.{ext}`
- 로컬 개발: LocalStack 또는 실제 S3 버킷

---

## 최종 의존성 목록

```gradle
// DB
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
runtimeOnly 'com.mysql:mysql-connector-j'

// Auth
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'
implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'

// 파일 스토리지
implementation 'software.amazon.awssdk:s3:2.31.0'

// AI
implementation 'com.openai:openai-java:2.9.0'
```
