---
authored_with: Codex
features_used:
  - source-driven-development
  - documentation-and-adrs
  - test-driven-development
date: 2026-10-14
---

# ADR-005: Whisper 응답의 오디오 길이로 10분 제한 검증

**상태:** 채택

---

## 배경

`POST /api/ai/record-drafts`는 오디오 입력을 10분 이하로 제한한다. 저장된 미디어에는 크기와 MIME type만 있어 서버가 오디오의 실제 길이를 바로 알 수 없다. MP3·M4A·WAV·WebM 모두에서 길이를 사전 측정하려면 미디어 파서 또는 외부 ffprobe 실행 환경이 필요하다.

## 결정

기존 ADR-004에서 선택한 `whisper-1`에 `verbose_json` 응답을 요청해 입력 오디오의 `duration`을 검사한다. 10분을 초과하거나 duration이 유효하지 않으면 GPT-4o 초안 생성 전에 요청을 거부한다. 파일은 기존 25MB 제한을 Whisper 호출 전에 별도로 적용한다.

공식 API는 Whisper의 `verbose_json` 응답에 입력 오디오 길이(초)를 제공한다([Transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create)). 이 선택은 새 라이브러리나 운영 바이너리를 추가하지 않고, 실제 전사에 사용된 오디오 길이를 기준으로 제한을 일관되게 검사한다.

## 대안

### JCodec

- 장점: Java 라이브러리 하나로 MP3·MP4·Matroska·WAV 컨테이너를 읽고 외부 바이너리가 필요 없다.
- 단점: Maven Central 배포가 2019년 이후 갱신되지 않았다. 실제 샘플 검사에서 MP3 duration이 0으로, WebM 오디오 트랙 duration이 null로 나와 허용된 형식을 모두 검사하지 못했다.
- 기각: 제한 검증에 실패하는 형식이 있어 사용하지 않는다.

### Apache Tika

- 장점: 유지되는 MP3·MP4·WAV parser가 있다.
- 단점: 표준 parser 목록에 WebM 지원이 없다.
- 기각: 모든 허용 형식에서 동일한 검사를 보장하지 못한다.

### FFprobe

- 장점: 다양한 오디오 컨테이너와 WebM의 실제 재생 시간을 측정하는 범용 도구다.
- 단점: 배포 환경에 바이너리 설치와 버전 관리가 필요하지만 저장소에 배포 정의가 없다.
- 기각: 현재 배포 환경이 확정되지 않아 재현할 수 없는 런타임 의존성을 추가하지 않는다.

## 결과

- 10분 초과 음성은 Whisper 처리 후 GPT-4o로 보내기 전에 거부한다. 초과 음성도 Whisper 요청 자체는 발생할 수 있어 해당 전사 비용은 발생할 수 있다.
- 25MB 제한은 기존처럼 OpenAI 호출 전에 검사한다.
- OpenAI는 `whisper-1`을 2027-02-26에 제거할 예정이라고 공지했다([Deprecations](https://developers.openai.com/api/docs/deprecations)). 제거 전 후속 작업에서 대체 STT 모델의 응답 길이 메타데이터와 응답 형식을 검증해야 한다.
