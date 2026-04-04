package com.airbnb.user.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class SendMessageRequest {
    @NotNull
    private String receiverId;
    @NotBlank
    private String content;
}
