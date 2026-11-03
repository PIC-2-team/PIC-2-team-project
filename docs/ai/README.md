# AI 기록 초안

음성 또는 텍스트로 입력한 관찰 내용을 생활기록 초안으로 정리한다. 구현은 `backend/src/main/java/com/project/backend/ai/`에 있다. 결정 근거는 [ADR-005](../decisions/005-ai-audio-duration-validation.md), [ADR-008](../decisions/008-ai-pipeline-design.md), [ADR-011(키워드 분류)](../decisions/011-keyword-based-category-classification.md)을 본다.

> **코드가 원본이다.** 이 폴더의 문서는 코드를 설명할 뿐이다. 프롬프트·사전·제한값을 바꾸는 PR은 이 문서도 함께 고친다.

## 흐름

`POST /api/ai/record-drafts` (`RecordDraftService`)

1. 권한 확인: 요청자가 그 당사자의 기록을 읽을 수 있어야 한다
2. 입력 확인: 텍스트(3000자 이하) 또는 오디오 `mediaId` 중 하나. 둘 다 있거나 둘 다 없으면 422
3. 음성이면 Whisper(`whisper-1`)로 전사. 응답의 오디오 길이가 10분을 넘으면 거부한다(ADR-005)
4. GPT-4o가 초안(`content`)만 작성한다. 입력은 "당사자 돌봄정보(참고 맥락)"와 "이번 기록의 관찰 내용"이다. 출력은 JSON 스키마(`content` 500자 이하)로 강제한다
5. **표현 사전**(`ExpressionSoftener`)이 낙인 표현을 정해진 표현으로 치환한다. 치환 결과가 500자를 넘으면 치환하지 않은 원문을 쓴다
6. **키워드 사전**(`KeywordCategoryClassifier`)이 전사문(또는 입력 텍스트)과 초안을 합쳐 카테고리를 정한다
7. `transcript`, `content`, `category`를 돌려준다. 저장은 사용자가 확인한 뒤 별도로 `POST .../records`로 한다

## 누가 무엇을 책임지나

| 책임 | 담당 | 결정 방식 | 문서 |
|---|---|---|---|
| 초안 문장 | GPT-4o | 프롬프트 | [prompt.md](prompt.md) |
| 낙인 표현 보장 | 표현 사전 | 정규식 치환(결정적) | [dictionaries.md](dictionaries.md) |
| 카테고리 | 키워드 사전 | 점수 계산(결정적) | [dictionaries.md](dictionaries.md) |

프롬프트는 비결정적이라 지시를 어길 수 있다. 그래서 반드시 지켜야 하는 규칙(낙인 표현)은 사전으로 한 번 더 보장하고, 카테고리는 GPT가 아니라 사전이 정한다.

## 제한값

| 항목 | 값 | 위치 |
|---|---|---|
| 텍스트 입력 | 3000자 이하 | `RecordDraftService.MAX_TEXT_LENGTH` |
| 오디오 | 10분 이하 | `MAX_AUDIO_DURATION_SECONDS` |
| 초안 | 500자 이하(JSON 스키마와 코드 검사) | `MAX_DRAFT_LENGTH` |
| GPT 응답 토큰 | 700 | `maxCompletionTokens` |
| 모델 | GPT-4o, Whisper-1 | |

AI 설정(`OPENAI_API_KEY`)이 없으면 503 `AI_UNAVAILABLE`이다.

## 현재 알려진 문제

[dictionaries.md](dictionaries.md)의 "측정한 한계"에 정리했다. 요약하면 다음과 같다.

- 표현 사전이 치환한 단어 뒤의 조사가 문법에 맞지 않는 경우가 있다(`장애우라고` → `장애인라고`)
- 카테고리 분류가 단어 일부와도 일치해서 `약속`이 건강으로, `사고력`이 응급으로 분류된다

## 품질 검사

실제 GPT로 표현 순화와 반복 요약을 확인하는 방법은 [quality-check.md](quality-check.md)에 있다(이슈 #213). OpenAI 키가 있는 사람이 실행한다.
