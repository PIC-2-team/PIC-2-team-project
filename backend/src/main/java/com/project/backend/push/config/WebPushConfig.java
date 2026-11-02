package com.project.backend.push.config;

import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.Security;

@Configuration
@EnableConfigurationProperties(VapidProperties.class)
public class WebPushConfig {

    @Bean
    public PushService pushService(VapidProperties vapid) throws Exception {
        if (!vapid.isConfigured()) {
            return null;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        return new PushService(vapid.getPublicKey(), vapid.getPrivateKey(), vapid.getSubject());
    }
}
