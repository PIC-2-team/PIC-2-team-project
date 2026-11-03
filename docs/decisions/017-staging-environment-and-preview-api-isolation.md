---
authored_with: Codex
features_used:
  - planning-and-task-breakdown
  - documentation-and-adrs
  - ci-cd-and-automation
date: 2026-11-03
---

# ADR-017: staging 환경과 Preview API 분리

## 상태

승인됨

## 맥락

Vercel Preview의 `/api/*` rewrite가 production Railway backend를 향해 Preview 검증이 운영 데이터에 영향을 줄 수 있었다. 릴리즈 전 수동 SQL과 핵심 사용자 흐름을 운영과 격리된 환경에서 확인해야 한다.

## 결정

- Railway 프로젝트 안에 production을 복제한 영구 `staging` 환경을 사용한다.
- staging backend는 `develop` 브랜치를 배포하고, staging MySQL만 사용한다.
- Vercel Preview 빌드는 `VITE_API_BASE_URL`로 staging backend를 직접 호출한다. `vercel.json`의 production API rewrite는 제거해 변수가 누락됐을 때 production API로 폴백하지 않게 한다.
- staging에는 production JWT secret, S3 자격증명·버킷, OpenAI API key를 사용하지 않는다. 이 값들은 staging 전용 값이 준비되기 전까지 비활성화한다.

## 고려한 대안

### Preview가 production API를 계속 사용

- 장점: 새 인프라와 설정이 필요 없다.
- 단점: 테스트 데이터와 계정 탈퇴·삭제·이관 검증이 운영 데이터에 영향을 준다.
- 기각: 릴리즈 검증 환경으로 안전하지 않다.

### PR마다 Railway 임시 환경 생성

- 장점: PR별 격리가 가장 강하다.
- 단점: DB 초기화·시드·비용·운영 복잡도가 증가한다.
- 기각: 현재는 공유 staging에서 릴리즈 검증을 먼저 안정화한다.

## 결과

- Preview와 production의 API·DB가 분리된다.
- staging 리소스 비용과 환경 변수 관리 부담이 생긴다.
- 미디어·실제 AI 생성은 staging 전용 외부 자격증명이 준비된 뒤에만 검증한다.
