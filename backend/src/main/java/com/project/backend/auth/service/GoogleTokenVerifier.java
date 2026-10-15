package com.project.backend.auth.service;

public interface GoogleTokenVerifier {
    GoogleUserInfo verify(String idToken);
}
