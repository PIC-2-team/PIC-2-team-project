package com.project.backend.ai;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * AI가 입력 표현을 그대로 옮기더라도 낙인 표현이 기록에 남지 않도록 사전 기반으로 치환한다.
 * 프롬프트는 비결정적이라 사전으로 한 번 더 보장한다 (ADR-011과 같은 이유).
 */
@Component
public class ExpressionSoftener {
    private static final Map<Pattern, Function<MatchResult, String>> REPLACEMENTS = new LinkedHashMap<>();

    // 받침이 없던 말이 받침 있는 말로 바뀔 때(장애우→장애인)와 그 반대(정신박약→지적장애)의 조사 짝
    private static final Map<String, String> TO_BATCHIM = Map.of(
            "라고", "이라고", "라는", "이라는", "는", "은", "를", "을", "가", "이", "와", "과", "로", "으로");
    private static final Map<String, String> TO_OPEN = Map.of(
            "이라고", "라고", "이라는", "라는", "이었", "였", "은", "는", "을", "를", "이", "가", "과", "와", "으로", "로");

    // "정상인 체온"처럼 정상 판정으로 쓰이는 경우가 흔해, 사람을 가리키는 조사가 바로 붙을 때만 치환한다
    private static final String PERSON_PARTICLE = "(?:들(?:과|와|이|가|은|는|을|를|의|에게|처럼|보다|도)?|과|와|이|가|은|는|을|를|의|에게|처럼|보다|도)";

    static {
        add("(?<![가-힣])정상인(?=" + PERSON_PARTICLE + "(?![가-힣]))", "비장애인");
        addWithParticle("장애우", "장애인", TO_BATCHIM);
        add("정신(?:지체|박약)(?=\\s?장애)", "지적");
        addWithParticle("정신박약", "지적장애", TO_OPEN);
        add("정신지체", "지적장애");
        add("(?<!도전적\\s?)문제\\s?행동", "도전적 행동");
    }

    private static void add(String regex, String replacement) {
        REPLACEMENTS.put(Pattern.compile(regex), m -> replacement);
    }

    private static void addWithParticle(String word, String replacement, Map<String, String> particles) {
        // 한 글자 조사는 뒤에 한글이 이어지면 다른 낱말의 일부일 수 있어 제외한다 (로서·으로는 예외)
        String alternatives = particles.keySet().stream()
                .map(p -> p.length() == 1 && !p.equals("로") ? p + "(?![가-힣])" : p)
                .collect(Collectors.joining("|"));
        Pattern pattern = Pattern.compile(word + "(?:(" + alternatives + "))?");
        REPLACEMENTS.put(pattern, m -> {
            String particle = m.group(1);
            return replacement + (particle == null ? "" : particles.get(particle));
        });
    }

    public String soften(String text) {
        if (text == null) return null;
        String result = text;
        for (var entry : REPLACEMENTS.entrySet()) {
            result = entry.getKey().matcher(result).replaceAll(m -> Matcher.quoteReplacement(entry.getValue().apply(m)));
        }
        return result;
    }
}
