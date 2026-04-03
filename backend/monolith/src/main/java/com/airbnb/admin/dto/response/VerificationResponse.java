package com.airbnb.admin.dto.response;

import lombok.Data;

@Data
public class VerificationResponse {
    private boolean success;
    private String message;
}
