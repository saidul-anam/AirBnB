package com.airbnb.user.dto.request;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
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
