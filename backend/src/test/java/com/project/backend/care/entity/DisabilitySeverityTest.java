package com.project.backend.care.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DisabilitySeverityTest {
    @Test
    void mapsLegacyGradesToSeverityAndLeavesMissingValuesUnset() {
        assertThat(DisabilitySeverity.fromLegacyGrade(1)).isEqualTo(DisabilitySeverity.SEVERE);
        assertThat(DisabilitySeverity.fromLegacyGrade(3)).isEqualTo(DisabilitySeverity.SEVERE);
        assertThat(DisabilitySeverity.fromLegacyGrade(4)).isEqualTo(DisabilitySeverity.LESS_SEVERE);
        assertThat(DisabilitySeverity.fromLegacyGrade(null)).isNull();
    }
}
