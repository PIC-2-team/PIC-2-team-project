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
        assertThat(softener.soften("정상인 앞에서는 조용하고 정상인이 오면 웃었습니다."))
                .isEqualTo("비장애인 앞에서는 조용하고 비장애인이 오면 웃었습니다.");
    }
}
