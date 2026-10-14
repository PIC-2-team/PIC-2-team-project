package com.project.backend.record.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

@Configuration
public class RecordTimeConfig {
    @Bean
    public Clock recordClock() { return Clock.systemUTC(); }
}
