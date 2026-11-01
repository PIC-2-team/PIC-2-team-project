package com.project.backend.schedule.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class UpdateScheduleRequestTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\n"})
    void 빈_제목은_거부한다(String title) {
        assertThat(validator.validate(new UpdateScheduleRequest(title, null, null))).hasSize(1);
    }

    @Test
    void 제목을_보내지_않으면_변경하지_않는_요청으로_허용한다() {
        assertThat(validator.validate(new UpdateScheduleRequest(null, "메모", null))).isEmpty();
    }

    @Test
    void 줄바꿈이_포함된_제목도_허용한다() {
        assertThat(validator.validate(new UpdateScheduleRequest("병원\n방문", null, null))).isEmpty();
    }
}
