package com.project.backend.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExpressionSoftenerTest {
    private final ExpressionSoftener softener = new ExpressionSoftener();

    @Test
    void replacesStigmatizingTermsWithRespectfulOnes() {
        assertThat(softener.soften("정상인과 함께 식사했습니다.")).isEqualTo("비장애인과 함께 식사했습니다.");
        assertThat(softener.soften("장애우 프로그램에 참여했습니다.")).isEqualTo("장애인 프로그램에 참여했습니다.");
        assertThat(softener.soften("정신지체 진단을 받았습니다.")).isEqualTo("지적장애 진단을 받았습니다.");
    }

    @Test
    void usesTheProjectTermForChallengingBehavior() {
        assertThat(softener.soften("오후에 문제행동이 있었습니다.")).isEqualTo("오후에 도전적 행동이 있었습니다.");
        assertThat(softener.soften("문제 행동을 보였습니다.")).isEqualTo("도전적 행동을 보였습니다.");
    }

    @Test
    void keepsTextWithoutTargetTermsUnchanged() {
        String text = "점심을 천천히 먹고 산책을 다녀왔습니다.";
        assertThat(softener.soften(text)).isEqualTo(text);
    }

    @Test
    void replacesEveryOccurrence() {
        assertThat(softener.soften("정상인과 달리 조용하고 정상인이 오면 웃었습니다."))
                .isEqualTo("비장애인과 달리 조용하고 비장애인이 오면 웃었습니다.");
    }

    @Test
    void doesNotChangeNormalAsAHealthJudgement() {
        for (String text : new String[]{"체온이 정상인 것을 확인했습니다.", "혈압이 정상인 범위였습니다.",
                "혈압이 정상인지 확인했습니다.", "맥박이 정상인데 졸려했습니다.", "비정상인 행동이 있었습니다.",
                "체온이 정상인이라 안심했습니다."}) {
            assertThat(softener.soften(text)).isEqualTo(text);
        }
    }

    @Test
    void doesNotDuplicateWordsAlreadyInTheReplacement() {
        assertThat(softener.soften("도전적 문제행동이 있었습니다.")).isEqualTo("도전적 문제행동이 있었습니다.");
        assertThat(softener.soften("정신지체 장애인 시설에 다닙니다.")).isEqualTo("지적 장애인 시설에 다닙니다.");
        assertThat(softener.soften("정신지체장애 진단을 받았습니다.")).isEqualTo("지적장애 진단을 받았습니다.");
        assertThat(softener.soften("정신지체인으로 등록되어 있습니다.")).isEqualTo("지적장애인으로 등록되어 있습니다.");
    }
}
