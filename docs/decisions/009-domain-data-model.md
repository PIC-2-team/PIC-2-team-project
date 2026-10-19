---
authored_with: Claude Code
features_used:
  - documentation-and-adrs
date: 2026-10-19
---

# ADR-009: 핵심 도메인 데이터 모델 설계

**상태:** 채택

---

## 배경

삶결은 발달장애인 한 명을 중심으로 **보호자 · 기관 · 활동지원사**가 얽힌 복잡한 권한 구조를 가진다. 데이터 모델은 다음 두 가지 요구를 동시에 충족해야 한다.

1. **정보의 지속성** — 돌봄 제공자가 바뀌어도 당사자의 생활정보가 단절되지 않아야 한다.
2. **접근의 즉시 회수** — 담당이 종료되면 활동지원사의 접근 권한이 즉시 사라져야 한다.

이 ADR은 이 두 요구를 어떤 구조로 풀었는지, 그 과정에서 내린 설계 결정을 기록한다.

---

## 핵심 엔티티 구조

### care 도메인 — "누가 누구를 돌보는가"

| 테이블 | 역할 |
|--------|------|
| `care_recipient` | 돌봄 대상자 원본. 삶결 고유번호(`careRecipientNumber`) 보유 |
| `care_recipient_disability` | 대상자의 장애 유형 목록 (다대다 분리) |
| `care_guardian` | 보호자↔대상자 관계. `GuardianType(PRIMARY\|SECONDARY)`, `GuardianStatus(ACTIVE\|PENDING\|REVOKED)` |
| `care_assignment` | 기관이 활동지원사를 대상자에게 배정한 레코드. `endDate·endedAt`으로 종료 관리 |
| `access_log` | 대상자 관련 자원 접근 이력 (감사 로그) |

### record 도메인 — "무엇을 기록하는가"

| 테이블 | 역할 |
|--------|------|
| `care_info` | 대상자의 **상태** 정보. 카테고리당 행 1개 (unique constraint) |
| `daily_record` | 시점마다 쌓이는 **일지** 기록. `pinned` 필드로 상단 고정 |
| `record_revision` | 일지 수정 이력 (버전 관리) |
| `record_suggestion` | 활동지원사의 수정 제안 → 보호자 승인 흐름 |
| `record_request` | 기관이 활동지원사에게 기록 제출을 요청하는 레코드 |

### organization 도메인 — "기관 구조"

| 테이블 | 역할 |
|--------|------|
| `organization` | 기관. `organizationCode`(12자)로 보호자가 기관을 찾아 연결 |
| `organization_member` | 기관↔사용자 멤버십 (`ACTIVE\|INACTIVE`) |
| `organization_recipient_link` | 기관↔대상자 연결 요청 (`PENDING→ACCEPTED\|REJECTED`) |

### 나머지

| 테이블 | 역할 |
|--------|------|
| `users` | 계정. `UserRole(GUARDIAN\|SUPPORT_WORKER\|INSTITUTION\|ADMIN)` 단일 역할 |
| `information_request` | 기관이 보호자에게 정보를 요청하는 메시지 흐름 |
| `notification` | 인앱 알림 |

---

## 결정 1 — CareInfo(생활정보)와 DailyRecord(일일 기록) 분리

### 배경

PRD의 생활정보(M1)와 일일 기록(M5)은 성격이 다르다.

- **생활정보**: 대상자의 현재 상태를 나타내는 **최신 스냅샷** — "지금 이 사람은 이렇다"
- **일일 기록**: 날짜와 상황마다 쌓이는 **시계열 일지** — "오늘 이런 일이 있었다"

### 고려한 옵션

**단일 테이블 통합**
- 타입 컬럼으로 구분
- 조회 조건이 복잡해지고, 최신 생활정보 조회에 MAX(updatedAt) 집계가 필요

**별도 테이블 분리**
- CareInfo는 `(careRecipientId, category)` 복합 unique constraint → 카테고리당 행 1개를 DB가 보장
- DailyRecord는 `(careRecipientId, recordedAt)` 복합 인덱스 → 시계열 조회에 최적화

### 결정

**별도 테이블 분리**를 선택한다. CareInfo의 unique constraint가 "카테고리당 최신값 1개" 불변식을 애플리케이션 코드 없이 DB 레벨에서 강제한다.

---

## 결정 2 — 카테고리별 content 저장 방식

### 고려한 옵션

**카테고리별 개별 컬럼**
- 스키마가 카테고리 추가마다 변경됨

**JSONB / JSON 컬럼**
- 카테고리 구조가 자유롭지만, 타입 안전성이 없고 MySQL에서 JSON 인덱스가 복잡

**`category` ENUM + `content` TEXT 컬럼**
- 카테고리 추가 = ENUM 값 추가 (DDL 변경이지만 컬럼 추가보다 작은 변경)
- content는 단순 TEXT이므로 쿼리와 인덱스가 단순

### 결정

**`category` ENUM + `content` TEXT** 방식을 선택한다.

CareInfo와 DailyRecord의 카테고리 집합이 의도적으로 다르다는 점에 주의한다.

| 구분 | 카테고리 |
|------|---------|
| `CareInfoCategory` (6개) | `COMMUNICATION, PREFERENCE, LIFESTYLE, HEALTH_MEDICATION, PRECAUTION, EMERGENCY` |
| `RecordCategory` (8개) | `COMMUNICATION, LIFESTYLE, MEAL, PREFERENCE, CHALLENGING_BEHAVIOR, HEALTH, EMERGENCY, OTHER` |

생활정보는 "현재 상태 요약"이므로 식사(MEAL)나 기타(OTHER) 카테고리가 없다. 일지는 그날 있었던 구체적 사건을 기록하므로 더 세분화됐다.

---

## 결정 3 — 역할 기반 접근 권한 구조

### 배경

담당 종료 시 활동지원사의 접근을 즉시 차단해야 한다. 이를 데이터 모델에 명시적으로 반영해야 한다.

### 결정

접근 권한을 세 단계 연결 체인으로 모델링한다.

```
User(INSTITUTION) → Organization → OrganizationRecipientLink → CareRecipient
                                ↘ CareAssignment(organizationId, supportWorkerId) ↗
```

- **기관↔대상자 연결**: `organization_recipient_link` (보호자가 기관 코드로 연결 요청 → 기관 승인)
- **기관↔활동지원사 배정**: `care_assignment.endedAt IS NULL`이 유효한 배정. `end()` 호출 시 즉시 종료
- **보호자 위임**: `care_guardian.type = SECONDARY`로 세컨드 보호자를 별도 모델링. `status = REVOKED`로 즉시 회수 가능

`User.role`은 단일 값이므로 한 사용자가 여러 역할을 동시에 갖지 않는다. INSTITUTION 역할 사용자만 Organization의 `ownerId`가 될 수 있다.

---

## 엔티티 관계 요약

```
User ─────────────────────────────── CareGuardian ──── CareRecipient
  │ (role=INSTITUTION)                   (PRIMARY/SECONDARY)    │
  │                                                              │
  └─ Organization ─── OrganizationMember (userId)               │
          │                                                      │
          └─ OrganizationRecipientLink ──────────────────────────┘
          │
          └─ CareAssignment (supportWorkerId) ─── User(SUPPORT_WORKER)
                    │
                    └────────────────────────── CareRecipient

CareRecipient ─── CareInfo (카테고리당 1행, unique)
             └─── DailyRecord (시계열, N개)
                       └─── RecordRevision (수정 이력)
                       └─── RecordSuggestion (활동지원사 제안)
             └─── AccessLog (감사 로그)

Organization ─── InformationRequest ─── CareRecipient
```

---

## 결과

- `care_assignment.endedAt`이 null이면 유효한 배정. 배정 종료 = `end()` 단일 호출로 접근 즉시 차단
- `care_info`는 INSERT 시 category 중복이면 DB가 unique violation을 반환 → UPSERT 패턴 필요
- `daily_record.deletedAt`으로 소프트 삭제를 구현하므로 쿼리에 `deletedAt IS NULL` 조건 필수
- `User.publicCode`(12자)는 주민등록번호 대신 쓰는 삶결 전용 식별자
- `care_recipient.careRecipientNumber`(12자)도 주민등록번호 대신 쓰는 대상자 고유번호
- `User` 테이블에 알림 수신 설정 6개 컬럼이 직접 포함됨 (별도 테이블 없음)
