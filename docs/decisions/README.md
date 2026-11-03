# 아키텍처 결정 기록 (ADR)

되돌리기 어려운 결정(기술 스택·DB·인증·외부 서비스·아키텍처·정책)은 구현 전에 ADR로 남긴다. 검토한 대안과 선택 이유를 반드시 포함한다.

## 새 ADR 번호 정하기

1. 작성 직전에 최신 `develop`을 받고 `ls docs/decisions`로 **가장 큰 번호 + 1**을 쓴다. 지금 다음 번호는 `017`이다
2. 파일 이름은 `NNN-짧은-영문-제목.md`다
3. 병합 전에 다시 `develop`을 합치고 같은 번호가 생겼는지 확인한다. 같은 시기에 열린 다른 PR이 먼저 병합됐다면 **나중에 병합하는 PR이 번호를 바꾼다**
4. 병합된 ADR의 번호와 파일 이름은 바꾸지 않는다. 코드 주석, PR, 노션 문서가 번호로 인용하기 때문이다
5. 코드 주석이나 문서에서 인용할 때 번호가 겹치는 ADR은 `ADR-014(회원 탈퇴)`처럼 제목을 함께 적는다

## 번호가 겹치는 ADR

병렬로 작업한 PR이 같은 번호를 골라 세 쌍이 겹쳤다. 파일 이름은 이미 인용되고 있어 바꾸지 않았고, 아래처럼 구분해서 부른다. 이름 변경은 팀이 정하면 별도 작업으로 한다.

| 번호 | 구분해서 부르는 이름 | 파일 |
|---|---|---|
| 011 | ADR-011(키워드 분류) | [011-keyword-based-category-classification.md](011-keyword-based-category-classification.md) |
| 011 | ADR-011(어드민 당사자 코드) | [011-admin-care-recipient-code.md](011-admin-care-recipient-code.md) |
| 014 | ADR-014(회원 탈퇴) | [014-account-deletion-policy-update.md](014-account-deletion-policy-update.md) |
| 014 | ADR-014(알림 요약·장애 정도) | [014-guardian-unread-notification-summary-and-disability-severity.md](014-guardian-unread-notification-summary-and-disability-severity.md) |
| 015 | ADR-015(SMS 인증) | [015-sms-phone-verification.md](015-sms-phone-verification.md) |
| 015 | ADR-015(요약 리포트 읽음 처리) | [015-summary-report-marks-included-notifications-read.md](015-summary-report-marks-included-notifications-read.md) |

코드 주석의 `ADR-014`는 모두 회원 탈퇴(ADR-014 회원 탈퇴)를 가리킨다.

## 색인

| 번호 | 제목 | 비고 |
|---|---|---|
| 001 | [FE 배포 플랫폼 선택](001-fe-deployment-platform.md) | |
| 002 | [고령자 친화 모드 구현 방식](002-senior-mode-implementation.md) | |
| 003 | [이슈 종료 컨벤션 — Refs vs Closes](003-issue-close-convention.md) | |
| 004 | [백엔드 기술 스택 확정](004-backend-tech-stack.md) | |
| 005 | [Whisper 응답의 오디오 길이로 10분 제한 검증](005-ai-audio-duration-validation.md) | |
| 006 | [BE 배포 플랫폼 선택](006-be-deployment-platform.md) | |
| 007 | [인증·인가 전략](007-auth-strategy.md) | |
| 008 | [AI 기록 초안 생성 파이프라인 설계](008-ai-pipeline-design.md) | |
| 009 | [핵심 도메인 데이터 모델 설계](009-domain-data-model.md) | |
| 010 | [슈퍼 어드민 기관 코드 발급 및 기관 등록 흐름 개선](010-organization-code-registration.md) | |
| 011 | [돌봄 보호자 기록 초안 카테고리 분류의 키워드 사전 전환](011-keyword-based-category-classification.md) | 번호 중복 |
| 011 | [슈퍼 어드민 당사자 고유 코드 발급 및 관리 체계](011-admin-care-recipient-code.md) | 번호 중복 |
| 012 | [회원 탈퇴 시 데이터 처리 정책](012-user-account-deletion-policy.md) | 승인됨, 014(회원 탈퇴)가 보완 |
| 013 | [당사자 프로필 확장 데이터 모델과 의료 정보 동의 방식](013-care-recipient-profile-extension.md) | 승인됨 |
| 014 | [회원 탈퇴 정책 보완 (ADR-012 갱신)](014-account-deletion-policy-update.md) | 승인됨, 번호 중복. 항목 1·2는 법률 검토(#74) 결과에 따라 바뀔 수 있음 |
| 014 | [보호자 미확인 알림 요약과 장애 정도 분류](014-guardian-unread-notification-summary-and-disability-severity.md) | 승인됨, 번호 중복 |
| 015 | [SMS 전화번호 인증 도입](015-sms-phone-verification.md) | **제안**(미승인), 번호 중복. 이슈 #217 |
| 015 | [요약 리포트에 포함된 알림 읽음 처리](015-summary-report-marks-included-notifications-read.md) | 승인됨, 번호 중복 |
| 016 | [개발 H2 데이터와 읽음 상태 유지](016-persist-development-h2-data.md) | 승인됨 |
