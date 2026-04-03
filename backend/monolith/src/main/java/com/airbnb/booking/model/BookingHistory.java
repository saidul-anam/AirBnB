package com.airbnb.booking.model;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingHistory {
    private LocalDateTime timestamp;
    private BookingStatus previousStatus;
    private BookingStatus newStatus;
    private String changedBy; // User ID or "SYSTEM"
    private String changedByRole; // GUEST, HOST, ADMIN, SYSTEM
    private String action; // e.g., "Booking created", "Payment completed", "Check-in confirmed"
    private String notes; // Additional details
    private PaymentStatus paymentStatus;
}
