package com.airbnb.user.controller;

import com.airbnb.user.dto.request.SendMessageRequest;
import com.airbnb.user.model.Message;
import com.airbnb.user.service.MessageService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<Message> sendMessage(
        Authentication authentication,
        @Valid @RequestBody SendMessageRequest request
    ) {
        String senderEmail = authentication.getName();
        return ResponseEntity.ok(
            messageService.sendMessage(senderEmail, request.getReceiverId(), request.getContent())
        );
    }

    @PostMapping("/{messageId}/react")
    public ResponseEntity<Message> reactToMessage(
        Authentication authentication,
        @PathVariable String messageId,
        @RequestParam String reaction
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(messageService.reactToMessage(email, messageId, reaction));
    }

    @GetMapping("/conversations")
    public ResponseEntity<Map<String, Object>> getConversations(
        Authentication authentication
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(messageService.getConversations(email));
    }

    @GetMapping("/history/{otherUserId}")
    public ResponseEntity<List<Message>> getMessageHistory(
        Authentication authentication,
        @PathVariable String otherUserId
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(messageService.getMessageHistory(email, otherUserId));
    }
}
