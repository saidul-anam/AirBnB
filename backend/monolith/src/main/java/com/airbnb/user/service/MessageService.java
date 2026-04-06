package com.airbnb.user.service;

import com.airbnb.user.model.Message;
import com.airbnb.user.model.User;
import com.airbnb.user.repository.MessageRepository;
import com.airbnb.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserPersistenceService userPersistenceService;

    public Message sendMessage(String senderEmail, String receiverId, String content) {
        User sender = userPersistenceService.findByEmail(senderEmail)
            .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userPersistenceService.findByUserId(receiverId)
            .orElseThrow(() -> new RuntimeException("Receiver not found"));

        Message msg = Message.builder()
            .senderId(sender.getUserId())
            .senderName(sender.getFirstName() + " " + sender.getLastName())
            .senderRole(sender.getRole().name())
            .senderProfileImage(sender.getProfileImage())
            .receiverId(receiver.getUserId())
            .receiverName(receiver.getFirstName() + " " + receiver.getLastName())
            .receiverRole(receiver.getRole().name())
            .receiverProfileImage(receiver.getProfileImage())
            .content(content)
            .timestamp(LocalDateTime.now())
            .read(false)
            .build();

        return messageRepository.save(msg);
    }

    public Message reactToMessage(String userEmail, String messageId, String reaction) {
        User user = userPersistenceService.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
            
        if (message.getReactions() == null) {
            message.setReactions(new HashMap<>());
        }
        
        // Remove reaction if the same reaction is clicked to toggle it off
        if (reaction.equals(message.getReactions().get(user.getUserId()))) {
            message.getReactions().remove(user.getUserId());
        } else {
            message.getReactions().put(user.getUserId(), reaction);
        }
        
        return messageRepository.save(message);
    }

    public List<Message> getMessageHistory(String userEmail, String otherUserId) {
        User user = userPersistenceService.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return messageRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderByTimestampAsc(
            user.getUserId(), otherUserId, user.getUserId(), otherUserId
        );
    }

    public Map<String, Object> getConversations(String userEmail) {
        User user = userPersistenceService.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        String myId = user.getUserId();

        List<Message> sent = messageRepository.findBySenderIdOrderByTimestampDesc(myId);
        List<Message> received = messageRepository.findByReceiverIdOrderByTimestampDesc(myId);

        List<Message> allMessages = new ArrayList<>();
        allMessages.addAll(sent);
        allMessages.addAll(received);
        allMessages.sort((m1, m2) -> m2.getTimestamp().compareTo(m1.getTimestamp())); // Descending

        Map<String, Message> latestMessages = new LinkedHashMap<>();
        for (Message m : allMessages) {
            String otherId = m.getSenderId().equals(myId) ? m.getReceiverId() : m.getSenderId();
            if (!latestMessages.containsKey(otherId)) {
                latestMessages.put(otherId, m);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("conversations", new ArrayList<>(latestMessages.values()));
        return result;
    }
}
