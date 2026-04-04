package com.airbnb.booking.service;

import com.airbnb.booking.model.Booking;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyBookingStatusChange(Booking booking, String recipientRole) {
        String topic = recipientRole.equals("ADMIN") 
            ? "/topic/admin/bookings" 
            : recipientRole.equals("HOST") 
                ? "/topic/hosts/" + booking.getHostId() + "/bookings"
                : "/topic/guests/" + booking.getGuestId() + "/bookings";

        log.info("Sending booking update to topic: {} for booking: {}", topic, booking.getId());

        messagingTemplate.convertAndSend(topic, 
            new BookingUpdateMessage(booking.getId(), booking.getStatus().toString(), booking.getPaymentStatus().toString()));
    }

    public void notifyNewBooking(Booking booking) {
        // Notify all relevant parties about new booking
        notifyBookingStatusChange(booking, "ADMIN");
        notifyBookingStatusChange(booking, "HOST");
        notifyBookingStatusChange(booking, "GUEST");
    }

    public void notifyPaymentUpdate(Booking booking) {
        String topic = "/topic/guests/" + booking.getGuestId() + "/payments";
        messagingTemplate.convertAndSend(topic, 
            new PaymentUpdateMessage(booking.getId(), booking.getPaymentStatus().toString()));
    }

    // Message classes
    public static class BookingUpdateMessage {
        private String bookingId;
        private String bookingStatus;
        private String paymentStatus;

        public BookingUpdateMessage(String bookingId, String bookingStatus, String paymentStatus) {
            this.bookingId = bookingId;
            this.bookingStatus = bookingStatus;
            this.paymentStatus = paymentStatus;
        }

        // Getters
        public String getBookingId() { return bookingId; }
        public String getBookingStatus() { return bookingStatus; }
        public String getPaymentStatus() { return paymentStatus; }
    }

    public static class PaymentUpdateMessage {
        private String bookingId;
        private String paymentStatus;

        public PaymentUpdateMessage(String bookingId, String paymentStatus) {
            this.bookingId = bookingId;
            this.paymentStatus = paymentStatus;
        }

        // Getters
        public String getBookingId() { return bookingId; }
        public String getPaymentStatus() { return paymentStatus; }
    }
}
