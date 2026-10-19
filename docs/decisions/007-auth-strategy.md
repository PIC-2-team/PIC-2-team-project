---
authored_with: Claude Code
features_used:
  - documentation-and-adrs
date: 2026-10-19
---

# ADR-007: 인증·인가 전략

**상태:** 채택

---

## 배경

삶결은 발달장애인의 민감한 돌봄 정보를 다루는 플랫폼이다. 동일한 피돌봄인에 대해 보호자·활동지원사·기관이 서로 다른 권한으로 접근하며, 담당 관계가 종료되면 즉시 접근이 회수돼야 한다.

이에 따라 인증 전략은 다음 요건을 충족해야 했다.

- 역할 기반 접근 제어 (GUARDIAN / SUPPORT_WORKER / INSTITUTION / ADMIN)
- 담당 배정 여부에 따른 피돌봄인별 세밀한 접근 제어
- 모바일 PWA 환경에서 세션 유지 (자동 갱신)
- 개인정보보호법 제15·18조 준수를 위한 동의 수집 연동

---

## 결정 1 — 인증 방식: Stateless JWT + Google OAuth

### 고려한 옵션

**Stateless JWT (채택)**
- 서버 세션 불필요 → Railway 단일 인스턴스에서 수평 확장 시에도 문제 없음
- Access Token에 `userId`와 `role` 클레임 포함 → 매 요청마다 DB 조회 없이 역할 확인 가능
- 단점: 토큰 강제 만료가 어려움 → Refresh Token DB 저장으로 보완

**서버 세션 (Spring Security 기본)**
- Redis 또는 DB 세션 저장 필요 → 인프라 복잡도 증가
- PWA 특성상 쿠키 관리가 복잡해짐
- 미채택: 상태 관리 인프라 없이도 동일 수준의 보안 달성 가능

**Google OAuth (병행 채택)**
- 보호자(50~60대) 대상 서비스에서 이메일 비밀번호 외 소셜 로그인 옵션 제공
- Google ID Token을 클라이언트에서 발급받아 서버로 전달, `RestTemplateGoogleTokenVerifier`로 검증
- Spring Security의 OAuth2 Client 방식(서버 사이드 리다이렉트)은 PWA에 부적합 → 클라이언트 주도 방식 채택

### 결정

**Stateless JWT (jjwt 0.12.x) + 클라이언트 주도 Google OAuth**

- Access Token: HMAC-SHA 서명, `sub`=userId, `role` 클레임 포함
- `Authorization: Bearer <token>` 헤더로 전달 (`JwtAuthFilter`가 파싱 후 Spring Security 컨텍스트에 `ROLE_<role>` 권한으로 등록)
- Access Token 만료 시간은 `jwt.access-token-expiry-seconds`로 설정

### 결과

- `/api/auth/**` 외 모든 API는 유효한 Access Token 필요
- `/api/admin/**`은 추가로 `ROLE_ADMIN` 권한 필요 (`SecurityConfig`)
- Google OAuth 신규 가입은 동의 티켓 흐름을 동일하게 거침

---

## 결정 2 — 동의 수집: 동의 티켓(JWT)

### 배경

개인정보보호법 제15·18조에 따라 기본 정보·민감 정보·정보 공유·마케팅 동의를 회원가입 전에 별도 수집해야 한다.

### 결정

회원가입 직전에 `POST /api/auth/consent`로 동의 내역을 서버에 전달하면, 서버가 30분 유효한 **동의 티켓(JWT)**을 발급한다. 이후 회원가입 요청에 이 티켓을 포함해야 처리된다.

- 동의 내역을 즉시 DB에 저장하지 않고, 회원가입 완료 시점에 원자적으로 저장
- 티켓 만료(30분) 시 동의 재수집 필요 → 동의 창 방치 후 가입하는 케이스 방지

---

## 결정 3 — Refresh Token: HttpOnly 쿠키 + DB 저장 + 토큰 로테이션

Refresh Token 저장소(DB 테이블)는 [ADR-004](004-backend-tech-stack.md)에서 결정됐다. 이 섹션은 전달 방식과 보안 설계를 다룬다.

### 전달 방식

**HttpOnly Secure Cookie (채택)**
- 쿠키명: `refreshToken`, `httpOnly=true`, `secure=true`, `sameSite=None`, `path=/api/auth`
- JavaScript에서 접근 불가 → XSS 공격으로 토큰 탈취 불가
- `SameSite=None`은 Vercel(FE)↔Railway(BE) 크로스 오리진 환경 때문

**localStorage / sessionStorage**
- JavaScript 직접 접근 가능 → XSS 취약
- 미채택

### DB 저장 구조

```
refresh_token(id, userId, tokenHash, expiresAt, revokedAt, createdAt)
```

- DB에는 SHA-256 해시값만 저장 (`tokenHash`), 원문은 클라이언트 쿠키에만 존재
- `idx_refresh_token_hash` 인덱스로 해시 조회 성능 확보

### 토큰 로테이션

`POST /api/auth/refresh` 호출 시:
1. 기존 토큰 `revokedAt` 업데이트 (즉시 무효화)
2. 새 토큰 발급 및 쿠키 교체

탈취된 토큰으로 재사용 시도 시 `REFRESH_TOKEN_REVOKED` 오류 반환.

---

## 결정 4 — 역할 기반 접근 제어(RBAC) 설계

### 역할 정의

| 역할 | 설명 | 기록 열람 | 기록 작성 | 수정 제안 | 관리 |
|------|------|-----------|-----------|-----------|------|
| `GUARDIAN` | 돌봄 보호자 (부모·가족) | O (담당 피돌봄인) | O | — | 권한 관리, 기관 이전 |
| `SUPPORT_WORKER` | 활동지원사 | O (배정 기간 내) | O (배정 기간 내) | O | — |
| `INSTITUTION` | 기관 담당자 | O (연결된 피돌봄인) | — | O | 활동지원사 배정·종료 |
| `ADMIN` | 슈퍼 어드민 | O (전체) | — | — | 플랫폼 관리 |

### 2계층 접근 제어

**1계층 — Spring Security (역할 단위)**
- `SecurityConfig`에서 `/api/admin/**`에 `hasRole("ADMIN")` 적용
- 그 외 모든 API는 인증만 확인

**2계층 — 비즈니스 로직 (`RecordAccessService` 등)**
- 역할만으로는 부족한 세밀한 관계 확인: 피돌봄인의 담당 보호자인지, 현재 배정된 활동지원사인지, 기관-피돌봄인 연결이 ACCEPTED 상태인지
- `verifyRead`, `verifyCreate`, `verifyEdit`, `verifyGuardian` 메서드로 세분화
- 권한 없으면 `FORBIDDEN(403)` 반환

### 결정

2계층 구조를 채택한다. Spring Security에 모든 비즈니스 규칙을 담으면 규칙 변경 시 Security 설정을 건드려야 하고 테스트가 어려워진다. 서비스 레이어에서 관계 기반 검증을 수행하면 비즈니스 규칙이 한 곳에 집중되고 단위 테스트가 용이하다.

---

## 전체 인증 흐름 요약

```
[회원가입]
POST /api/auth/consent → 동의 티켓 발급 (30분 JWT)
POST /api/auth/register (동의 티켓 포함) → Access Token(body) + Refresh Token(cookie)

[로그인]
POST /api/auth/login → Access Token(body) + Refresh Token(cookie)

[Google OAuth]
POST /api/auth/google (Google ID Token) → 기존 회원이면 즉시 세션, 신규면 pendingToken 반환
POST /api/auth/google/register (pendingToken + 동의 티켓) → Access Token + Refresh Token

[갱신]
POST /api/auth/refresh (쿠키 자동 전송) → 새 Access Token + 새 Refresh Token(쿠키 교체)

[로그아웃]
POST /api/auth/logout → Refresh Token 무효화 + 쿠키 만료
```

---

## 결과

- Access Token은 `Authorization: Bearer` 헤더로 API 요청마다 첨부
- Refresh Token은 HttpOnly 쿠키로 관리되며 JavaScript 접근 불가
- 로그아웃·탈취 대응 시 `revokedAt` 갱신으로 즉시 무효화
- 비즈니스 레이어에서 피돌봄인별 세밀한 접근 제어 (`RecordAccessService`)
