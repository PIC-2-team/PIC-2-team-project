package com.project.backend.ai;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * AI가 입력 표현을 그대로 옮기더라도 낙인 표현이 기록에 남지 않도록 사전 기반으로 치환한다.
 * 프롬프트는 비결정적이라 사전으로 한 번 더 보장한다 (ADR-011과 같은 이유).
 */
@Component
public class ExpressionSoftener {
    private static final Map<Pattern, String> REPLACEMENTS = new LinkedHashMap<>();

    static {
        add("정상인", "비장애인");
        add("장애우", "장애인");
        add("정신지체", "지적장애");
        add("정신박약", "지적장애");
        add("문제\\s?행동", "도전적 행동");
    }

    private static void add(String regex, String replacement) {
        REPLACEMENTS.put(Pattern.compile(regex), replacement);
    }

    public String soften(String text) {
        if (text == null) return null;
        String result = text;
        for (var entry : REPLACEMENTS.entrySet()) {
            result = entry.getKey().matcher(result).replaceAll(entry.getValue());
        }
        return result;
    }
}
