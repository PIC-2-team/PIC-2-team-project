---
authored_with: Claude Code
features_used:
  - superpowers:brainstorming
date: 2026-10-09
---

# ADR-001: FE 배포 플랫폼 선택

**상태:** 채택 (MVP 단계) / 상업화 전환 전 재검토 필요

---

## 배경

React SPA/PWA인 삶결 FE를 정적 파일로 배포해야 한다. 발표용(demo)과 실서비스용(production) 두 환경이 필요하며, 현재는 Vercel을 사용 중이다.

- 현 단계: MVP 실증 (ENACTUS 대회 발표 + 복지기관 파일럿)
- 향후 단계: B2G(지자체 SaaS) / B2B(복지기관 구독) 상업 서비스

---

## 고려한 옵션

### 1. Vercel Hobby (Free) — 현재 사용 중

| | |
|-|-|
| 비용 | 무료 |
| 대역폭 | 100GB/월 |
| 빌드 | 100회/일 |
| CI/CD | GitHub Actions 연동 (현재 구성) |
| PWA 지원 | 완전 지원 |
| **TOS 제한** | **비상업적 개인 사용(non-commercial)만 허용** |

**문제점:** Vercel Hobby는 상업적 서비스에 사용 불가. 삶결이 B2G/B2B 서비스로 전환되면 TOS 위반.

---

### 2. Vercel Pro

| | |
|-|-|
| 비용 | $20/월/멤버 |
| 대역폭 | 1TB/월 |
| 상업적 사용 | 허용 |
| 기존 설정 재사용 | 100% (마이그레이션 없음) |

**트레이드오프:** Hobby에서 Pro로 업그레이드만 하면 됨. 비용이 발생하지만 이전 작업 무효화 없음.

---

### 3. Cloudflare Pages

| | |
|-|-|
| 비용 | 무료 (유료 플랜도 저렴) |
| 대역폭 | **무제한** |
| 빌드 | 500회/월 |
| 상업적 사용 | **제한 없음** |
| CI/CD | GitHub Actions 또는 Cloudflare 자체 CI |
| PWA 지원 | 완전 지원 |

**트레이드오프:** Vercel 대비 개발 경험(DX) 약간 열세. 단, 상업용 무료 티어가 가장 넉넉하고 TOS 문제가 없음.

---

### 4. Netlify

| | |
|-|-|
| 비용 | 무료 (100GB 대역폭/월) |
| 상업적 사용 | 허용 (Starter 플랜) |
| CI/CD | 자체 CI 또는 GitHub Actions |

**트레이드오프:** Vercel/Cloudflare 대비 뚜렷한 이점 없음. 고려에서 제외.

---

### 5. GitHub Pages

| | |
|-|-|
| 비용 | 무료 |
| 상업적 사용 | 허용 |
| 제약 | 빌드 커스터마이징 제한, SPA 라우팅 설정 번거로움 |

**트레이드오프:** PWA/SPA 배포에 추가 설정 필요. 팀 DX 저하. 제외.

---

## 결정

### 현 단계 (MVP / 실증)

**Vercel Hobby 유지** — 두 환경(demo, production) 모두 Vercel에 배포.

근거:
- MVP 실증 단계는 비상업적 사용으로 간주 가능 (실제 매출 없음)
- 현재 CI/CD, 도메인 설정, 팀 숙련도 모두 Vercel 기반
- 재설정 비용 없이 빠른 진행 가능

### 상업화 전환 전 (B2G/B2B 계약 시작 전)

**아래 두 옵션 중 하나로 전환:**

| 옵션 | 조건 |
|------|------|
| Vercel Pro | 팀이 Vercel DX를 유지하고 싶고 비용 감당 가능 시 |
| Cloudflare Pages | 무료 유지가 중요하고 마이그레이션 비용 감수 가능 시 |

---

## 전환 트리거

다음 중 하나 발생 시 즉시 재검토한다:

- 복지기관/지자체와 실제 계약 체결
- 월 활성 사용자 100명 초과
- Vercel로부터 TOS 관련 경고 수신

---

## 결과

- 단기: Vercel Hobby로 배포 환경 2개 운영 (demo, production)
- 중기: 상업화 전환 시 Vercel Pro 또는 Cloudflare Pages로 이전
- 마이그레이션 비용: Cloudflare Pages 이전 시 CI/CD 재작성 약 1일 예상
