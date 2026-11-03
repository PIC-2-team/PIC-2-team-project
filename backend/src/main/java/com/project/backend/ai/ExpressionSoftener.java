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

    // "정상인 체온"처럼 정상 판정으로 쓰이는 경우가 흔해, 사람을 가리키는 조사가 바로 붙을 때만 치환한다
    private static final String PERSON_PARTICLE = "(?:들(?:과|와|이|가|은|는|을|를|의|에게|처럼|보다|도)?|과|와|이|가|은|는|을|를|의|에게|처럼|보다|도)";

    static {
        add("(?<![가-힣])정상인(?=" + PERSON_PARTICLE + "(?![가-힣]))", "비장애인");
        add("장애우", "장애인");
        add("정신(?:지체|박약)(?=\\s?장애)", "지적");
        add("정신(?:지체|박약)", "지적장애");
        add("문제\\s?행동", "주의 사항");
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
