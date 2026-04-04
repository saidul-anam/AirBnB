package com.airbnb.booking.service;

import com.airbnb.notification.service.NotificationService;
import com.airbnb.notification.dto.request.CreateNotificationRequest;
import com.airbnb.booking.model.Booking;
import com.airbnb.booking.model.BookingHistory;
import com.airbnb.booking.model.BookingStatus;
import com.airbnb.booking.model.PaymentStatus;
import com.airbnb.booking.repository.BookingRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;
    
    // Helper method to add history entries
    private void addHistoryEntry(Booking booking, BookingStatus previousStatus, BookingStatus newStatus,
                                 String changedBy, String changedByRole, String action, String notes) {
        BookingHistory history = BookingHistory.builder()
            .timestamp(LocalDateTime.now())
            .previousStatus(previousStatus)
            .newStatus(newStatus)
            .changedBy(changedBy)
            .changedByRole(changedByRole)
            .action(action)
            .notes(notes)
            .paymentStatus(booking.getPaymentStatus())
            .build();
        booking.getHistory().add(history);
    }

    public Booking createBooking(Booking booking) {
        // Check for overlapping bookings
        if (hasOverlappingBooking(booking)) {
            throw new RuntimeException("Property is already booked for the requested dates. Please choose different dates.");
        }

        booking.setCreatedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        booking.setStatus(BookingStatus.PENDING);
        
        // Handle payment status based on booking creation
        if (booking.getPaymentStatus() == null) {
            // Default to PENDING for immediate payment
            booking.setPaymentStatus(PaymentStatus.PENDING);
        }
        
        // Set appropriate status based on payment choice
        if (booking.getPaymentStatus() == PaymentStatus.PAY_LATER) {
            booking.setStatus(BookingStatus.NOT_PAID_YET);
        }
        
        // Add history entry
        addHistoryEntry(booking, null, booking.getStatus(), booking.getGuestId(), "GUEST", 
            "Booking created", "Guest initiated booking request");
        
        Booking saved = bookingRepository.save(booking);

        // Send real-time WebSocket notifications
        webSocketService.notifyNewBooking(saved);

        String paymentInfo = "";
        if (booking.getPaymentStatus() == PaymentStatus.PAY_LATER) {
            paymentInfo = " [PAY LATER - Guest will pay before check-in]";
        } else if (booking.getPaymentStatus() == PaymentStatus.PENDING) {
            paymentInfo = " [IMMEDIATE PAYMENT REQUIRED]";
        }

        // Notify Admin
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("New Booking Request")
                .message(
                    "Guest " + booking.getGuestId() +
                    " requested to book host " + booking.getHostId() +
                    " from " + booking.getCheckInDate() +
                    " to " + booking.getCheckOutDate() +
                    " — Property: " + (booking.getPropertyName() != null ? booking.getPropertyName() : "N/A") +
                    " | Total: $" + booking.getTotalPrice() +
                    paymentInfo
                )
                .type("BOOKING_REQUEST")
                .actionTargetUserId(saved.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host about new booking request
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("New Booking Request")
                .message(
                    "You have a new booking request from guest " + booking.getGuestId() +
                    " for " + booking.getCheckInDate() +
                    " to " + booking.getCheckOutDate() +
                    ". Booking total: $" + booking.getTotalPrice() +
                    (booking.getPaymentStatus() == PaymentStatus.PAY_LATER ? " (Pay Later)" : " (Immediate Payment)")
                )
                .type("BOOKING_REQUEST")
                .actionTargetUserId(saved.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Guest that booking was created
        String guestMessage = booking.getPaymentStatus() == PaymentStatus.PAY_LATER
            ? "Your booking request has been submitted and is awaiting admin approval. You can complete payment before check-in."
            : "Your booking request has been submitted. Please complete the payment to confirm your reservation.";
            
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Booking Request Submitted")
                .message(guestMessage)
                .type("BOOKING_REQUEST")
                .actionTargetUserId(saved.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking processPayment(String id, String paymentMethod) {
        Booking booking = getBooking(id);
        
        // Verify booking is in a valid status for payment
        boolean canPay = booking.getStatus() == BookingStatus.NOT_PAID_YET || 
            (booking.getStatus() == BookingStatus.PENDING && (booking.getPaymentStatus() == PaymentStatus.PAY_LATER || booking.getPaymentStatus() == PaymentStatus.PENDING)) ||
            (booking.getStatus() == BookingStatus.CONFIRMED && (booking.getPaymentStatus() == PaymentStatus.PAY_LATER || booking.getPaymentStatus() == PaymentStatus.PENDING));
        
        if (!canPay) {
            throw new RuntimeException("Payment can only be processed for bookings with pending payment");
        }
        
        BookingStatus previousStatus = booking.getStatus();
        
        // Update payment status
        booking.setPaymentStatus(PaymentStatus.COMPLETED);
        booking.setPaymentMethod(paymentMethod);
        booking.setPaymentCompletedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Auto-confirm the booking if it was NOT_PAID_YET
        if (previousStatus == BookingStatus.NOT_PAID_YET) {
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setPaymentApprovedAt(LocalDateTime.now());
        }
        
        // Add history entry for payment completion
        addHistoryEntry(booking, previousStatus, booking.getStatus(), booking.getGuestId(), "GUEST",
            "Payment completed", "Payment method: " + paymentMethod + " | Amount: $" + booking.getTotalPrice());
        
        Booking saved = bookingRepository.save(booking);

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Payment Received! ✅")
                .message(
                    "Your payment of $" + booking.getTotalPrice() +
                    " for " + booking.getPropertyName() +
                    " has been processed successfully. Your booking is now confirmed!"
                )
                .type("PAYMENT_PROCESSED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Guest Payment Completed")
                .message(
                    "Guest " + booking.getGuestId() +
                    " has completed payment for " + booking.getPropertyName() +
                    ". Booking is now confirmed for " + booking.getCheckInDate() +
                    " to " + booking.getCheckOutDate() + "."
                )
                .type("HOST_PAYMENT_NOTIFICATION")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Admin
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("Payment Processed ✅")
                .message(
                    "Guest " + booking.getGuestId() +
                    " has paid $" + booking.getTotalPrice() +
                    " for booking #" + booking.getId().substring(0, 8) +
                    ". Payment confirmed and booking status updated."
                )
                .type("ADMIN_PAYMENT_NOTIFICATION")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking approvePayment(String id) {
        Booking booking = getBooking(id);
        
        // Verify payment is completed
        if (booking.getPaymentStatus() != PaymentStatus.COMPLETED) {
            throw new RuntimeException("Payment must be completed before approval");
        }
        
        BookingStatus previousStatus = booking.getStatus();
        
        // Update status to confirmed
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentApprovedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for payment approval
        addHistoryEntry(booking, previousStatus, BookingStatus.CONFIRMED, "ADMIN", "ADMIN",
            "Payment approved", "Admin approved payment of $" + booking.getTotalPrice());
        
        Booking saved = bookingRepository.save(booking);

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Booking Fully Confirmed! 🎉")
                .message(
                    "Your payment has been approved and your booking for " + booking.getPropertyName() +
                    " is fully confirmed. We look forward to hosting you!"
                )
                .type("BOOKING_FULLY_CONFIRMED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Booking Fully Confirmed")
                .message(
                    "The booking for " + booking.getPropertyName() +
                    " has been fully confirmed. Guest payment approved."
                )
                .type("HOST_BOOKING_CONFIRMED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking getBooking(String id) {
        return bookingRepository
            .findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> getBookingsByGuest(String guestId) {
        return bookingRepository.findByGuestId(guestId);
    }

    public List<Booking> getBookingsByHost(String hostId) {
        return bookingRepository.findByHostId(hostId);
    }

    public Booking confirmBooking(String id) {
        Booking booking = getBooking(id);
        BookingStatus previousStatus = booking.getStatus();
        
        BookingStatus newStatus = booking.getPaymentStatus() == PaymentStatus.PAY_LATER 
            ? BookingStatus.NOT_PAID_YET 
            : BookingStatus.CONFIRMED;
            
        booking.setStatus(newStatus);
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for admin confirmation
        addHistoryEntry(booking, previousStatus, newStatus, "ADMIN", "ADMIN",
            "Booking confirmed by admin", "Admin approved the booking request");
        
        Booking saved = bookingRepository.save(booking);

        // Send real-time WebSocket notifications
        webSocketService.notifyBookingStatusChange(saved, "ADMIN");
        webSocketService.notifyBookingStatusChange(saved, "HOST");
        webSocketService.notifyBookingStatusChange(saved, "GUEST");

        String payNote = booking.getPaymentStatus() == PaymentStatus.PAY_LATER
            ? " You have chosen to pay later before check-in." : " Your payment has been processed.";

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Booking Confirmed! ✅")
                .message(
                    "Your booking for " + booking.getPropertyName() +
                    " from " + booking.getCheckInDate() +
                    " to " + booking.getCheckOutDate() +
                    " has been confirmed by admin!" + payNote
                )
                .type("BOOKING_CONFIRMED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Reservation Confirmed")
                .message(
                    "A reservation for your property " + booking.getPropertyName() +
                    " from " + booking.getCheckInDate() +
                    " to " + booking.getCheckOutDate() +
                    " has been confirmed. Total: $" + booking.getTotalPrice()
                )
                .type("HOST_RESERVATION")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking hostConfirmCheckIn(String id, String hostId) {
        Booking booking = getBooking(id);
        
        // Verify that the hostId matches the booking's host
        if (!booking.getHostId().equals(hostId)) {
            throw new RuntimeException("Host can only confirm check-in for their own bookings");
        }
        
        // Verify booking is in confirmed status
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("Booking must be confirmed before check-in");
        }
        
        // Verify it's the check-in date
        LocalDate today = LocalDate.now();
        if (today.isBefore(booking.getCheckInDate())) {
            throw new RuntimeException("Check-in can only be confirmed on or after the check-in date");
        }
        
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setActualCheckInTime(LocalDateTime.now());
        booking.setCheckInConfirmedBy(hostId);
        booking.setUpdatedAt(LocalDateTime.now());
        Booking saved = bookingRepository.save(booking);

        // Send real-time WebSocket notifications
        webSocketService.notifyBookingStatusChange(saved, "GUEST");
        webSocketService.notifyBookingStatusChange(saved, "HOST");

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Check-In Confirmed! 🏠")
                .message(
                    "Your check-in for " + booking.getPropertyName() +
                    " has been confirmed by the host. Enjoy your stay!"
                )
                .type("GUEST_CHECKED_IN")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Admin
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("Guest Checked In")
                .message(
                    "Guest " + booking.getGuestId() +
                    " has checked in for " + booking.getPropertyName() +
                    " (" + booking.getCheckInDate() + " to " + booking.getCheckOutDate() + ")" +
                    " confirmed by host " + booking.getHostId()
                )
                .type("ADMIN_CHECKIN_NOTIFICATION")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking hostConfirmCheckOut(String id, String hostId) {
        Booking booking = getBooking(id);
        
        // Verify that hostId matches the booking's host
        if (!booking.getHostId().equals(hostId)) {
            throw new RuntimeException("Host can only confirm check-out for their own bookings");
        }
        
        // Verify booking is in checked-in status
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new RuntimeException("Booking must be checked-in before check-out");
        }
        
        booking.setStatus(BookingStatus.COMPLETED);
        booking.setActualCheckOutTime(LocalDateTime.now());
        booking.setCheckOutConfirmedBy(hostId);
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for check-out
        addHistoryEntry(booking, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED, hostId, "HOST",
            "Check-out confirmed", "Host confirmed guest check-out at " + LocalDateTime.now());
        
        Booking saved = bookingRepository.save(booking);

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Check-Out Completed! 👋")
                .message(
                    "Your check-out for " + booking.getPropertyName() +
                    " has been confirmed. Thank you for staying with us!"
                )
                .type("GUEST_CHECKED_OUT")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Admin about pending payout
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("Ready for Payout 💰")
                .message(
                    "Booking #" + booking.getId().substring(0, 8) +
                    " for " + booking.getPropertyName() +
                    " is completed. Host " + booking.getHostId() +
                    " is ready for payout. Total: $" + booking.getTotalPrice() +
                    " (Host payout: $" + (booking.getTotalPrice() != null ? 
                        booking.getTotalPrice().multiply(BigDecimal.valueOf(
                            booking.getPayoutPercentage() != null ? booking.getPayoutPercentage() / 100 : 0.8
                        )) : "0") + ")"
                )
                .type("ADMIN_PAYOUT_REQUEST")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking cancelBooking(String id, String cancellationReason, String cancelledBy) {
        Booking booking = getBooking(id);
        BookingStatus previousStatus = booking.getStatus();
        
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledBy(cancelledBy);
        booking.setCancelledAt(LocalDateTime.now());
        if (cancellationReason != null && !cancellationReason.isBlank()) {
            booking.setCancellationReason(cancellationReason);
        }
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Calculate refund based on who cancelled and the policy
        BigDecimal refundAmount = calculateRefundAmount(booking, cancelledBy);
        booking.setRefundAmount(refundAmount);
        
        // Update payment status to refunded if there's a refund
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            booking.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        
        // Add history entry for cancellation
        String changedByRole = "HOST".equals(cancelledBy) ? "HOST" : "GUEST";
        String changedById = "HOST".equals(cancelledBy) ? booking.getHostId() : booking.getGuestId();
        String notes = "Cancelled by " + cancelledBy + " | Reason: " + 
            (cancellationReason != null ? cancellationReason : "No reason provided") + 
            " | Refund: $" + refundAmount;
        addHistoryEntry(booking, previousStatus, BookingStatus.CANCELLED, changedById, changedByRole,
            "Booking cancelled", notes);
        
        Booking saved = bookingRepository.save(booking);

        if ("HOST".equals(cancelledBy)) {
            // Host cancellation - full refund to customer
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientUserId(booking.getGuestId())
                    .title("Booking Cancelled by Host - Full Refund")
                    .message(
                        "Your booking for " + booking.getPropertyName() +
                        " has been cancelled by the host. You will receive a full refund of $" + refundAmount +
                        ". Reason: " + (cancellationReason != null ? cancellationReason : "No reason provided")
                    )
                    .type("HOST_CANCELLATION")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );

            // Notify Admin about host cancellation
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientRole("ADMIN")
                    .title("Host Cancellation - Refund Required")
                    .message(
                        "Host " + booking.getHostId() +
                        " cancelled booking #" + booking.getId().substring(0, 8) +
                        ". Full refund of $" + refundAmount + " to be processed to guest " + booking.getGuestId() +
                        ". Reason: " + (cancellationReason != null ? cancellationReason : "No reason provided")
                    )
                    .type("ADMIN_HOST_CANCELLATION")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );
        } else {
            // Customer cancellation - refund according to host policy
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientUserId(booking.getGuestId())
                    .title("Booking Cancelled")
                    .message(
                        "Your booking for " + booking.getPropertyName() +
                        " has been cancelled. Refund amount: $" + refundAmount +
                        " based on the host's cancellation policy."
                    )
                    .type("CUSTOMER_CANCELLATION")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );

            // Notify Host about customer cancellation
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientUserId(booking.getHostId())
                    .title("Guest Cancelled Booking")
                    .message(
                        "Guest " + booking.getGuestId() +
                        " cancelled their booking for " + booking.getPropertyName() +
                        ". Refund amount: $" + refundAmount +
                        ". Reason: " + (cancellationReason != null ? cancellationReason : "No reason provided")
                    )
                    .type("GUEST_CANCELLATION")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );

            // Notify Admin about customer cancellation
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientRole("ADMIN")
                    .title("Customer Cancellation")
                    .message(
                        "Customer " + booking.getGuestId() +
                        " cancelled booking #" + booking.getId().substring(0, 8) +
                        ". Refund amount: $" + refundAmount +
                        " based on host policy."
                    )
                    .type("ADMIN_CUSTOMER_CANCELLATION")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );
        }

        return saved;
    }

    public Booking updateBookingStatus(String id, BookingStatus status) {
        Booking booking = getBooking(id);
        BookingStatus previousStatus = booking.getStatus();
        
        booking.setStatus(status);
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for status update
        addHistoryEntry(booking, previousStatus, status, "ADMIN", "ADMIN",
            "Status updated", "Admin changed status from " + previousStatus + " to " + status);
        
        Booking saved = bookingRepository.save(booking);

        String statusLabel = status.name().replace("_", " ");

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Booking " + statusLabel)
                .message(
                    "Your booking for " + booking.getPropertyName() +
                    " from " + booking.getCheckInDate() +
                    " has been updated to: " + statusLabel
                )
                .type("BOOKING_" + status.name())
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Booking " + statusLabel)
                .message(
                    "A booking for your property " + booking.getPropertyName() +
                    " from " + booking.getCheckInDate() +
                    " has been updated to: " + statusLabel
                )
                .type("BOOKING_" + status.name())
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking refundBooking(String id, String reason) {
        Booking booking = getBooking(id);
        BookingStatus previousStatus = booking.getStatus();

        // Calculate refund based on cancellation policy
        BigDecimal refundAmount = calculateRefundAmount(booking);
        booking.setStatus(BookingStatus.REFUNDED);
        booking.setPaymentStatus(PaymentStatus.REFUNDED);
        booking.setRefundAmount(refundAmount);
        if (reason != null && !reason.isBlank()) {
            booking.setCancellationReason(reason);
        }
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for refund
        addHistoryEntry(booking, previousStatus, BookingStatus.REFUNDED, "ADMIN", "ADMIN",
            "Refund processed", "Admin processed refund of $" + refundAmount + 
            (reason != null ? " | Reason: " + reason : ""));
        
        Booking saved = bookingRepository.save(booking);

        // Notify Guest
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getGuestId())
                .title("Refund Processed 💸")
                .message(
                    "Your refund of $" + refundAmount +
                    " for the booking at " + booking.getPropertyName() +
                    " (" + booking.getCheckInDate() + " to " + booking.getCheckOutDate() + ")" +
                    " has been processed by admin."
                )
                .type("BOOKING_REFUNDED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Host
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Booking Refunded")
                .message(
                    "A booking for your property " + booking.getPropertyName() +
                    " (" + booking.getCheckInDate() + " to " + booking.getCheckOutDate() + ")" +
                    " has been refunded to the guest."
                )
                .type("BOOKING_REFUNDED")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking issuePayout(String id) {
        Booking booking = getBooking(id);
        if (booking.isPayoutIssued()) {
            throw new RuntimeException("Payout already issued for this booking");
        }
        
        // Verify booking is completed
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new RuntimeException("Payout can only be issued for completed bookings");
        }

        double payoutPct = booking.getPayoutPercentage() != null ? booking.getPayoutPercentage() : 80.0;
        BigDecimal totalPrice = booking.getTotalPrice() != null ? booking.getTotalPrice() : BigDecimal.ZERO;
        BigDecimal payoutAmount = totalPrice.multiply(BigDecimal.valueOf(payoutPct / 100))
            .setScale(2, RoundingMode.HALF_UP);

        booking.setPayoutIssued(true);
        booking.setPayoutAmount(payoutAmount);
        booking.setPayoutPercentage(payoutPct);
        booking.setPayoutIssuedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        
        // Add history entry for payout
        addHistoryEntry(booking, booking.getStatus(), booking.getStatus(), "ADMIN", "ADMIN",
            "Payout issued", "Admin issued payout of $" + payoutAmount + 
            " (" + (int)payoutPct + "% of $" + totalPrice + ") to host");
        
        Booking saved = bookingRepository.save(booking);

        // Notify Host of payout
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(booking.getHostId())
                .title("Payout Received 💰")
                .message(
                    "You have received a payout of $" + payoutAmount +
                    " (" + (int) payoutPct + "% of $" + totalPrice + ")" +
                    " for the completed booking at " + booking.getPropertyName() +
                    " (" + booking.getCheckInDate() + " to " + booking.getCheckOutDate() + ")."
                )
                .type("HOST_PAYOUT")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        // Notify Admin of payout issuance
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("Payout Issued")
                .message(
                    "Payout of $" + payoutAmount + " issued to host " + booking.getHostId() +
                    " for booking #" + booking.getId().substring(0, 8)
                )
                .type("ADMIN_PAYOUT")
                .actionTargetUserId(booking.getId())
                .status("UNREAD")
                .build()
        );

        return saved;
    }

    public Booking updatePaymentStatus(String id, PaymentStatus status) {
        Booking booking = getBooking(id);
        booking.setPaymentStatus(status);
        booking.setUpdatedAt(LocalDateTime.now());

        if (status == PaymentStatus.COMPLETED) {
            // Notify guest that payment was approved
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientUserId(booking.getGuestId())
                    .title("Payment Approved ✅")
                    .message(
                        "Your payment of $" + booking.getTotalPrice() +
                        " for booking at " + booking.getPropertyName() +
                        " has been approved by admin."
                    )
                    .type("PAYMENT_APPROVED")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );

            // Notify host that guest payment is complete
            notificationService.createInternalNotification(
                CreateNotificationRequest.builder()
                    .recipientUserId(booking.getHostId())
                    .title("Guest Payment Confirmed")
                    .message(
                        "The guest has completed payment of $" + booking.getTotalPrice() +
                        " for booking at " + booking.getPropertyName() + "."
                    )
                    .type("PAYMENT_APPROVED")
                    .actionTargetUserId(booking.getId())
                    .status("UNREAD")
                    .build()
            );
        }

        return bookingRepository.save(booking);
    }

    private BigDecimal calculateRefundAmount(Booking booking) {
        return calculateRefundAmount(booking, "CUSTOMER");
    }

    private BigDecimal calculateRefundAmount(Booking booking, String cancelledBy) {
        if (booking.getTotalPrice() == null) return BigDecimal.ZERO;

        // Host cancellation - always full refund
        if ("HOST".equals(cancelledBy)) {
            return booking.getTotalPrice();
        }

        // Customer cancellation - based on policy
        String policy = booking.getCancellationPolicy() != null ? booking.getCancellationPolicy() : "MODERATE";
        long daysUntilCheckIn = 0;
        if (booking.getCheckInDate() != null) {
            daysUntilCheckIn = java.time.temporal.ChronoUnit.DAYS.between(
                java.time.LocalDate.now(), booking.getCheckInDate()
            );
        }

        double refundPercent = switch (policy) {
            case "FLEXIBLE" -> daysUntilCheckIn >= 1 ? 100 : 50;
            case "STRICT" -> daysUntilCheckIn >= 7 ? 50 : 0;
            default -> // MODERATE
                daysUntilCheckIn >= 5 ? 100 : (daysUntilCheckIn >= 1 ? 50 : 0);
        };

        return booking.getTotalPrice()
            .multiply(BigDecimal.valueOf(refundPercent / 100))
            .setScale(2, RoundingMode.HALF_UP);
    }

    private boolean hasOverlappingBooking(Booking newBooking) {
        // Get all existing bookings for the same host/property
        List<Booking> existingBookings = bookingRepository.findByHostId(newBooking.getHostId());
        
        // Filter out non-conflicting bookings
        return existingBookings.stream().anyMatch(existing -> {
            // Skip if existing booking is cancelled or refunded
            if (existing.getStatus() == BookingStatus.CANCELLED || existing.getStatus() == BookingStatus.REFUNDED) {
                return false;
            }
            
            // Check for date overlap
            boolean datesOverlap = isDateRangeOverlapping(
                newBooking.getCheckInDate(),
                newBooking.getCheckOutDate(),
                existing.getCheckInDate(),
                existing.getCheckOutDate()
            );
            
            if (!datesOverlap) {
                return false;
            }
            
            // Check capacity constraints
            return isCapacityExceeded(existingBookings, newBooking);
        });
    }

    private boolean isDateRangeOverlapping(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private boolean isCapacityExceeded(List<Booking> existingBookings, Booking newBooking) {
        // Count active bookings for each overlapping day
        // For simplicity, we'll check if total bookings would exceed capacity
        // In a real implementation, you'd check day-by-day capacity
        
        // Get host's booking capacity (default to 1 if not set)
        Integer capacity = getHostBookingCapacity(newBooking.getHostId());
        
        // Count overlapping bookings
        long overlappingCount = existingBookings.stream()
            .filter(existing -> isDateRangeOverlapping(
                newBooking.getCheckInDate(),
                newBooking.getCheckOutDate(),
                existing.getCheckInDate(),
                existing.getCheckOutDate()
            ))
            .count();
        
        // Add 1 for the new booking
        return overlappingCount >= capacity;
    }

    private Integer getHostBookingCapacity(String hostId) {
        // This would typically come from user service
        // For now, default to 1, but this should be fetched from the host's profile
        return 1; // Default capacity
    }
}

