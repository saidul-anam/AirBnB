package com.airbnb.notification.repository;

import com.airbnb.notification.model.NotificationRecord;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationRecordRepository
    extends MongoRepository<NotificationRecord, String>
{
    List<NotificationRecord> findByRecipientUserIdOrderByCreatedAtDesc(
        String recipientUserId
    );
    List<NotificationRecord> findByRecipientRoleOrderByCreatedAtDesc(
        String recipientRole
    );
    List<NotificationRecord> findByTypeOrderByCreatedAtDesc(String type);
    List<NotificationRecord> findByTypeAndStatusOrderByCreatedAtDesc(
        String type,
        String status
    );
    java.util.Optional<NotificationRecord> findByNotificationId(
        String notificationId
    );
}
