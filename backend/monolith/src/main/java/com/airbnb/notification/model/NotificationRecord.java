package com.airbnb.notification.model;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRecord {

    @Id
    private String id;

    @Builder.Default
    private String notificationId = UUID.randomUUID().toString();

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

    @CreatedDate
    private LocalDateTime createdAt;
}
