package com.airbnb.admin.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerificationActionResponse {
    private boolean success;
    private String message;
    private String userId;
    private String notificationId;
    private String verificationStatus;
}
