package com.airbnb.notification.controller;

import com.airbnb.notification.dto.request.CreateNotificationRequest;
import com.airbnb.notification.dto.request.UpdateNotificationStatusRequest;
import com.airbnb.notification.dto.response.NotificationRecordResponse;
import com.airbnb.notification.dto.response.NotificationResponse;
import com.airbnb.notification.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/internal")
    public ResponseEntity<NotificationResponse> createInternalNotification(
        @Valid @RequestBody CreateNotificationRequest request
    ) {
        NotificationResponse response =
            notificationService.createInternalNotification(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{recipientUserId}")
    public ResponseEntity<
        List<NotificationRecordResponse>
    > getUserNotifications(@PathVariable String recipientUserId) {
        return ResponseEntity.ok(
            notificationService.getNotificationsForUser(recipientUserId)
        );
    }

    @GetMapping("/roles/{recipientRole}")
    public ResponseEntity<
        List<NotificationRecordResponse>
    > getRoleNotifications(@PathVariable String recipientRole) {
        return ResponseEntity.ok(
            notificationService.getNotificationsForRole(recipientRole)
        );
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<
        List<NotificationRecordResponse>
    > getNotificationsByType(
        @PathVariable String type,
        @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(
            notificationService.getNotificationsByType(type, status)
        );
    }

    @PutMapping("/{notificationId}/status")
    public ResponseEntity<NotificationRecordResponse> updateStatus(
        @PathVariable String notificationId,
        @RequestBody UpdateNotificationStatusRequest request
    ) {
        return ResponseEntity.ok(
            notificationService.updateStatus(notificationId, request)
        );
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<NotificationRecordResponse> markAsRead(
        @PathVariable String notificationId
    ) {
        return ResponseEntity.ok(
            notificationService.markAsRead(notificationId)
        );
    }
}
