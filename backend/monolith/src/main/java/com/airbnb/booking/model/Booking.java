package com.airbnb.booking.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;
    private String guestId;
    private String hostId;
    private String propertyId; // Property ID reference
    private String propertyName; // Name of the booked property
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BigDecimal totalPrice;
    private BookingStatus status;
    private PaymentStatus paymentStatus;

    // Check-in/Check-out tracking
    private LocalDateTime actualCheckInTime;  // When host confirmed check-in
    private LocalDateTime actualCheckOutTime; // When host confirmed check-out
    private String checkInConfirmedBy;        // Host ID who confirmed check-in
    private String checkOutConfirmedBy;       // Host ID who confirmed check-out

    // Cancellation fields
    private String cancellationReason;
    private String cancelledBy;           // HOST or CUSTOMER
    private LocalDateTime cancelledAt;
    private BigDecimal refundAmount;
    private String cancellationPolicy; // FLEXIBLE, MODERATE, STRICT

    // Payout fields
    private BigDecimal payoutAmount;     // Amount host receives
    private Double payoutPercentage;     // Host's payout % at time of booking
    private boolean payoutIssued;        // Whether payout was issued to host
    private LocalDateTime payoutIssuedAt;

    // Payment tracking
    private String paymentMethod;        // CARD, PAYPAL, etc.
    private LocalDateTime paymentCompletedAt;
    private LocalDateTime paymentApprovedAt;

    // Review tracking
    private boolean reviewSubmitted;
    private String reviewId;
    private LocalDateTime reviewSubmittedAt;

    // History tracking
    @Builder.Default
    private java.util.List<BookingHistory> history = new java.util.ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
