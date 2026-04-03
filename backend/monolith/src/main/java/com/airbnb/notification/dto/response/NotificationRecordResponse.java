package com.airbnb.notification.dto.response;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationRecordResponse {
    private String notificationId;
    private String recipientUserId;
    private String recipientRole;
    private String title;
    private String message;
    private String type;
    private String actionTargetUserId;
    private String status;
    private String resolutionNote;
    private LocalDateTime readAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
