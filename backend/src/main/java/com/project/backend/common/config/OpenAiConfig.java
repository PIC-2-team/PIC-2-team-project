package com.project.backend.common.config;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

@Configuration
@Conditional(OpenAiConfig.ApiKeyConfigured.class)
public class OpenAiConfig {

    @Value("${openai.api-key:${openai.api.key:}}")
    private String apiKey;

    @Bean
    public OpenAIClient openAIClient() {
        return OpenAIOkHttpClient.builder()
                .apiKey(apiKey)
                .build();
    }

    public static class ApiKeyConfigured implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            var environment = context.getEnvironment();
            return StringUtils.hasText(environment.getProperty("openai.api-key"))
                    || StringUtils.hasText(environment.getProperty("openai.api.key"));
        }
    }
}
