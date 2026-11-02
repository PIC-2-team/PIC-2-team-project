package com.project.backend.push.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "vapid")
@Getter
@Setter
public class VapidProperties {
    private String publicKey = "";
    private String privateKey = "";
    private String subject = "mailto:admin@samgyeol.com";

    public boolean isConfigured() {
        return publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }
}
