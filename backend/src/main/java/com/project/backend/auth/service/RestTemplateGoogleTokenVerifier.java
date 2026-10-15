package com.project.backend.auth.service;

import com.project.backend.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class RestTemplateGoogleTokenVerifier implements GoogleTokenVerifier {

    private static final String TOKENINFO_URL =
            "https://oauth2.googleapis.com/tokeninfo?id_token={idToken}";

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    @SuppressWarnings("unchecked")
    public GoogleUserInfo verify(String idToken) {
        try {
            Map<String, String> resp = restTemplate.getForObject(TOKENINFO_URL, Map.class, idToken);
            if (resp == null || resp.get("sub") == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "유효하지 않은 Google 토큰입니다.");
            }
            return new GoogleUserInfo(resp.get("sub"), resp.get("email"), resp.get("name"));
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN", "유효하지 않은 Google 토큰입니다.");
        }
    }
}
