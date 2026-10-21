package com.project.backend.ai;

import com.project.backend.record.entity.RecordCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class KeywordCategoryClassifierTest {

    private final KeywordCategoryClassifier classifier = new KeywordCategoryClassifier();

    @Test
    @DisplayName("식사 관련 키워드가 포함되면 MEAL로 분류된다")
    void classifiesMeal() {
        RecordCategory category = classifier.classify("오늘 점심 식사로 밥과 국을 맛있게 다 먹었습니다.");
        assertThat(category).isEqualTo(RecordCategory.MEAL);
    }

    @Test
    @DisplayName("복약 및 건강 관련 키워드가 포함되면 HEALTH로 분류된다")
    void classifiesHealth() {
        RecordCategory category = classifier.classify("감기 기운이 있어서 처방받은 약을 점심 먹고 투약했습니다.");
        assertThat(category).isEqualTo(RecordCategory.HEALTH);
    }

    @Test
    @DisplayName("생활습관 및 위생 관련 키워드가 포함되면 LIFESTYLE로 분류된다")
    void classifiesLifestyle() {
        RecordCategory category = classifier.classify("아침에 기상 후 스스로 세수하고 양치를 마쳤습니다.");
        assertThat(category).isEqualTo(RecordCategory.LIFESTYLE);
    }

    @Test
    @DisplayName("의사소통 관련 키워드가 포함되면 COMMUNICATION으로 분류된다")
    void classifiesCommunication() {
        RecordCategory category = classifier.classify("선생님의 눈을 맞추며 손짓과 그림카드로 원하는 것을 표현했습니다.");
        assertThat(category).isEqualTo(RecordCategory.COMMUNICATION);
    }

    @Test
    @DisplayName("도전행동 관련 키워드가 포함되면 CHALLENGING_BEHAVIOR로 분류된다")
    void classifiesChallengingBehavior() {
        RecordCategory category = classifier.classify("자신의 뜻대로 되지 않자 고함을 지르고 머리를 박는 자해 행동을 보였습니다.");
        assertThat(category).isEqualTo(RecordCategory.CHALLENGING_BEHAVIOR);
    }

    @Test
    @DisplayName("선호 및 비선호 관련 키워드가 포함되면 PREFERENCE로 분류된다")
    void classifiesPreference() {
        RecordCategory category = classifier.classify("새로운 블록 놀이에 큰 흥미와 관심을 보이며 즐거워했습니다.");
        assertThat(category).isEqualTo(RecordCategory.PREFERENCE);
    }

    @Test
    @DisplayName("응급 및 위기 상황 키워드가 포함되면 EMERGENCY로 분류된다")
    void classifiesEmergency() {
        RecordCategory category = classifier.classify("계단에서 넘어져 발목 골절 부상이 의심되어 119 구급차를 호출했습니다.");
        assertThat(category).isEqualTo(RecordCategory.EMERGENCY);
    }

    @Test
    @DisplayName("매칭되는 키워드가 없으면 OTHER로 분류된다")
    void classifiesOtherWhenNoKeywordsMatch() {
        RecordCategory category = classifier.classify("오늘 하루도 무탈하게 지나갔습니다.");
        assertThat(category).isEqualTo(RecordCategory.OTHER);
    }

    @Test
    @DisplayName("입력이 null이거나 빈 문자열이면 OTHER로 분류된다")
    void classifiesOtherWhenInputIsBlankOrNull() {
        assertThat(classifier.classify((String) null)).isEqualTo(RecordCategory.OTHER);
        assertThat(classifier.classify("")).isEqualTo(RecordCategory.OTHER);
        assertThat(classifier.classify("   ")).isEqualTo(RecordCategory.OTHER);
        assertThat(classifier.classify(null, "")).isEqualTo(RecordCategory.OTHER);
    }

    @Test
    @DisplayName("여러 텍스트가 인자로 주어지면 합산하여 분류한다")
    void classifiesMultipleTextsCombined() {
        // transcript에는 점심 언급, draft에는 약 언급 -> HEALTH 가중치 또는 식사 가중치 비교
        RecordCategory category = classifier.classify("점심", "처방받은 약을 복용하고 병원 진료를 다녀왔습니다.");
        assertThat(category).isEqualTo(RecordCategory.HEALTH);
    }

    @Test
    @DisplayName("위급 상황 키워드는 식사나 일상 키워드보다 높은 가중치로 우선 분류된다")
    void emergencyTakesPrecedenceOverLifestyle() {
        RecordCategory category = classifier.classify("점심 식사 중 기도가 막히는 질식 사고가 발생하여 응급 처치를 진행했습니다.");
        assertThat(category).isEqualTo(RecordCategory.EMERGENCY);
    }
}
