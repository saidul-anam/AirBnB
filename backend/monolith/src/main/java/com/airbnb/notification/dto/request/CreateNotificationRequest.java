package com.airbnb.notification.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNotificationRequest {
    private String recipientUserId;
    private String recipientRole;
    private String title;
    private String message;
    private String type;
    private String actionTargetUserId;
    private String status;
    private String resolutionNote;
}
