package com.airbnb.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    private String id;
    private String senderId;
    
    // We store minimal static details to save front-end joins
    private String senderName;
    private String senderRole;
    private String senderProfileImage;

    private String receiverId;
    private String receiverName;
    private String receiverRole;
    private String receiverProfileImage;

    private String content;
    private LocalDateTime timestamp;
    private boolean read;
    
    @Builder.Default
    private Map<String, String> reactions = new HashMap<>();
}
