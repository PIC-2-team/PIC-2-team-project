package com.project.backend.care.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class RoutineRequestTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void 정상_요청은_통과한다() {
        assertThat(validator.validate(new RoutineRequest(LocalTime.of(8, 0), "아침 식사", "천천히"))).isEmpty();
        assertThat(validator.validate(new RoutineRequest(LocalTime.of(8, 0), "아침 식사", null))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "　"})
    void 빈_제목은_거부한다(String title) {
        assertThat(validator.validate(new RoutineRequest(LocalTime.of(8, 0), title, null))).hasSize(1);
    }

    @Test
    void 시간이_없으면_거부한다() {
        assertThat(validator.validate(new RoutineRequest(null, "산책", null))).hasSize(1);
    }

    @Test
    void 제목과_메모_길이_제한을_넘으면_거부한다() {
        assertThat(validator.validate(new RoutineRequest(LocalTime.of(8, 0), "가".repeat(101), null))).hasSize(1);
        assertThat(validator.validate(new RoutineRequest(LocalTime.of(8, 0), "산책", "가".repeat(501)))).hasSize(1);
    }
}
