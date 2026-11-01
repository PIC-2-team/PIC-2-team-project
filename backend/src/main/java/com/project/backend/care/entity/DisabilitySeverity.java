package com.project.backend.care.entity;

public enum DisabilitySeverity {
    SEVERE,
    LESS_SEVERE;

    public static DisabilitySeverity fromLegacyGrade(Integer grade) {
        if (grade == null) return null;
        return grade >= 1 && grade <= 3 ? SEVERE : LESS_SEVERE;
    }
}
