package com.airbnb.user.repository;

import com.airbnb.user.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderByTimestampAsc(
        String senderId1, String receiverId1, 
        String receiverId2, String senderId2
    );
    
    List<Message> findBySenderIdOrderByTimestampDesc(String senderId);
    List<Message> findByReceiverIdOrderByTimestampDesc(String receiverId);
}
