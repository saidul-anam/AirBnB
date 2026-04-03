package com.airbnb.notification.service;

import com.airbnb.notification.dto.request.CreateNotificationRequest;
import com.airbnb.notification.dto.request.UpdateNotificationStatusRequest;
import com.airbnb.notification.dto.response.NotificationRecordResponse;
import com.airbnb.notification.dto.response.NotificationResponse;
import com.airbnb.notification.model.NotificationRecord;
import com.airbnb.notification.repository.NotificationRecordRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRecordRepository notificationRecordRepository;

    public NotificationResponse createInternalNotification(
        CreateNotificationRequest request
    ) {
        NotificationRecord record = NotificationRecord.builder()
            .recipientUserId(blankToNull(request.getRecipientUserId()))
            .recipientRole(blankToNull(request.getRecipientRole()))
            .title(request.getTitle())
            .message(request.getMessage())
            .type(request.getType())
            .actionTargetUserId(blankToNull(request.getActionTargetUserId()))
            .status(
                StringUtils.hasText(request.getStatus())
                    ? request.getStatus().trim()
                    : "UNREAD"
            )
            .resolutionNote(blankToNull(request.getResolutionNote()))
            .build();

        NotificationRecord saved = notificationRecordRepository.save(record);
        return NotificationResponse.builder()
            .success(true)
            .message("Notification created successfully.")
            .notificationId(saved.getNotificationId())
            .status(saved.getStatus())
            .build();
    }

    public List<NotificationRecordResponse> getNotificationsForUser(
        String recipientUserId
    ) {
        return notificationRecordRepository
            .findByRecipientUserIdOrderByCreatedAtDesc(recipientUserId)
            .stream()
            .map(this::mapToResponse)
            .toList();
    }

    public List<NotificationRecordResponse> getNotificationsForRole(
        String recipientRole
    ) {
        return notificationRecordRepository
            .findByRecipientRoleOrderByCreatedAtDesc(recipientRole)
            .stream()
            .map(this::mapToResponse)
            .toList();
    }

    public List<NotificationRecordResponse> getNotificationsByType(
        String type,
        String status
    ) {
        List<NotificationRecord> records = StringUtils.hasText(status)
            ? notificationRecordRepository.findByTypeAndStatusOrderByCreatedAtDesc(
                  type,
                  status
              )
            : notificationRecordRepository.findByTypeOrderByCreatedAtDesc(type);

        return records.stream().map(this::mapToResponse).toList();
    }

    public NotificationRecordResponse updateStatus(
        String notificationId,
        UpdateNotificationStatusRequest request
    ) {
        NotificationRecord record = notificationRecordRepository
            .findByNotificationId(notificationId)
            .orElseThrow(() ->
                new IllegalArgumentException("Notification not found.")
            );

        if (StringUtils.hasText(request.getStatus())) {
            record.setStatus(request.getStatus().trim());
        }
        if (StringUtils.hasText(request.getResolutionNote())) {
            record.setResolutionNote(request.getResolutionNote().trim());
        }

        if ("READ".equalsIgnoreCase(record.getStatus())) {
            record.setReadAt(LocalDateTime.now());
        }
        if (
            "APPROVED".equalsIgnoreCase(record.getStatus()) ||
            "REJECTED".equalsIgnoreCase(record.getStatus())
        ) {
            record.setResolvedAt(LocalDateTime.now());
        }

        return mapToResponse(notificationRecordRepository.save(record));
    }

    public NotificationRecordResponse markAsRead(String notificationId) {
        NotificationRecord record = notificationRecordRepository
            .findByNotificationId(notificationId)
            .orElseThrow(() ->
                new IllegalArgumentException("Notification not found.")
            );

        if (record.getReadAt() == null) {
            record.setReadAt(LocalDateTime.now());
        }
        if ("UNREAD".equalsIgnoreCase(record.getStatus())) {
            record.setStatus("READ");
        }

        return mapToResponse(notificationRecordRepository.save(record));
    }

    private NotificationRecordResponse mapToResponse(
        NotificationRecord record
    ) {
        return NotificationRecordResponse.builder()
            .notificationId(record.getNotificationId())
            .recipientUserId(record.getRecipientUserId())
            .recipientRole(record.getRecipientRole())
            .title(record.getTitle())
            .message(record.getMessage())
            .type(record.getType())
            .actionTargetUserId(record.getActionTargetUserId())
            .status(record.getStatus())
            .resolutionNote(record.getResolutionNote())
            .readAt(record.getReadAt())
            .resolvedAt(record.getResolvedAt())
            .createdAt(record.getCreatedAt())
            .build();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
