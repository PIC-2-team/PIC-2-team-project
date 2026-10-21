package com.project.backend.ai;

import com.project.backend.record.entity.RecordCategory;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class KeywordCategoryClassifier {

    private record CategoryRule(RecordCategory category, double weight, List<String> keywords) {}

    // 카테고리별 키워드 및 가중치 정의
    // 위기대처(EMERGENCY) 및 도전행동(CHALLENGING_BEHAVIOR)은 안전/위험 관련이므로 더 높은 가중치 부여
    private static final List<CategoryRule> RULES = List.of(
            new CategoryRule(RecordCategory.EMERGENCY, 3.0, List.of(
                    "응급", "119", "구급차", "실종", "부상", "낙상", "골절", "화상",
                    "질식", "기도폐쇄", "기도막", "기도가 막", "호흡곤란", "경련", "발작",
                    "의식소실", "심폐소생", "출혈", "기절", "응급실", "112", "사고"
            )),
            new CategoryRule(RecordCategory.CHALLENGING_BEHAVIOR, 2.0, List.of(
                    "소리지르", "자해", "공격", "때리", "꼬집", "물어", "물기", "던지",
                    "부수", "뛰쳐", "배회", "침뱉", "고함", "울부짖", "떼쓰", "머리박",
                    "할퀴", "난폭", "발버둥", "자해행동", "도전행동"
            )),
            new CategoryRule(RecordCategory.HEALTH, 1.5, List.of(
                    "약", "복약", "투약", "처방", "병원", "진료", "의사", "간호사",
                    "열", "체온", "감기", "기침", "두통", "복통", "설사", "구토",
                    "오한", "혈압", "혈당", "연고", "안약", "주사", "치과", "물리치료",
                    "반창고", "소독", "통증", "아프", "아파"
            )),
            new CategoryRule(RecordCategory.MEAL, 1.0, List.of(
                    "밥", "식사", "아침", "점심", "저녁", "간식", "반찬", "국", "찌개",
                    "수저", "숟가락", "젓가락", "포크", "물", "음료", "우유", "먹었",
                    "먹음", "먹다", "삼키", "씹", "편식", "식판", "배고", "배불",
                    "급식", "간식시간"
            )),
            new CategoryRule(RecordCategory.LIFESTYLE, 1.0, List.of(
                    "기상", "취침", "잠", "수면", "낮잠", "양치", "이닦", "칫솔", "치약",
                    "세수", "세안", "샤워", "목욕", "머리감", "옷", "환복", "갈아입",
                    "화장실", "배변", "대변", "소변", "기저귀", "산책", "운동", "체조",
                    "청소", "정리", "외출", "등원", "하원", "귀가"
            )),
            new CategoryRule(RecordCategory.COMMUNICATION, 1.0, List.of(
                    "말", "대화", "표현", "눈맞춤", "눈을 맞", "제스처", "손짓", "몸짓",
                    "목소리", "대답", "인사", "aac", "그림카드", "낱말", "발음", "호명",
                    "끄덕", "도리도리", "지시따르", "의사표현", "손가락질"
            )),
            new CategoryRule(RecordCategory.PREFERENCE, 1.0, List.of(
                    "좋아", "싫어", "선호", "비선호", "관심", "흥미", "취향", "거부",
                    "거절", "즐겨", "원하", "원치", "음악듣", "장난감", "놀이", "애착",
                    "만족", "불만", "싫증", "즐거워"
            ))
    );

    public RecordCategory classify(String... texts) {
        if (texts == null || texts.length == 0) {
            return RecordCategory.OTHER;
        }

        StringBuilder combined = new StringBuilder();
        for (String text : texts) {
            if (text != null && !text.isBlank()) {
                combined.append(' ').append(text);
            }
        }

        String fullText = combined.toString().trim().toLowerCase(Locale.ROOT);
        if (fullText.isEmpty()) {
            return RecordCategory.OTHER;
        }

        RecordCategory bestCategory = RecordCategory.OTHER;
        double maxScore = 0.0;

        for (CategoryRule rule : RULES) {
            int matchCount = 0;
            for (String keyword : rule.keywords()) {
                if (fullText.contains(keyword.toLowerCase(Locale.ROOT))) {
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                double score = matchCount * rule.weight();
                if (score > maxScore) {
                    maxScore = score;
                    bestCategory = rule.category();
                }
            }
        }

        return bestCategory;
    }
}
