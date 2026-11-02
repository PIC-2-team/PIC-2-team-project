package com.project.backend.push.service;

import com.project.backend.push.entity.PushSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final PushService pushService;

    public void send(PushSubscription sub, String title, String body) {
        if (pushService == null) {
            return;
        }
        String payload = String.format(
                "{\"title\":\"%s\",\"body\":\"%s\",\"url\":\"/records/new\"}",
                title.replace("\"", "\\\""),
                body.replace("\"", "\\\"")
        );
        try {
            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload
            );
            pushService.send(notification);
        } catch (Exception e) {
            log.warn("Push 발송 실패 (userId={}, endpoint={}): {}", sub.getUserId(), sub.getEndpoint(), e.getMessage());
        }
    }
}
