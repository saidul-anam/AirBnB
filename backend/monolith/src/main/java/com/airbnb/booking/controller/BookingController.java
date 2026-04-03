package com.airbnb.booking.controller;

import com.airbnb.booking.model.Booking;
import com.airbnb.booking.model.BookingStatus;
import com.airbnb.booking.model.PaymentStatus;
import com.airbnb.booking.service.BookingService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking) {
        return ResponseEntity.ok(bookingService.createBooking(booking));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Booking> getBooking(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.getBooking(id));
    }

    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<Booking>> getBookingsByGuest(@PathVariable String guestId) {
        return ResponseEntity.ok(bookingService.getBookingsByGuest(guestId));
    }

    @GetMapping("/host/{hostId}")
    public ResponseEntity<List<Booking>> getBookingsByHost(@PathVariable String hostId) {
        return ResponseEntity.ok(bookingService.getBookingsByHost(hostId));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<Booking> confirmBooking(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.confirmBooking(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(
        @PathVariable String id,
        @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("cancellationReason") : null;
        String cancelledBy = body != null ? body.get("cancelledBy") : "CUSTOMER";
        return ResponseEntity.ok(bookingService.cancelBooking(id, reason, cancelledBy));
    }

    @PutMapping("/{id}/checkin")
    public ResponseEntity<Booking> checkinBooking(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, BookingStatus.CHECKED_IN));
    }

    @PutMapping("/{id}/host-checkin")
    public ResponseEntity<Booking> hostConfirmCheckIn(
        @PathVariable String id,
        @RequestParam String hostId
    ) {
        return ResponseEntity.ok(bookingService.hostConfirmCheckIn(id, hostId));
    }

    @PutMapping("/{id}/host-checkout")
    public ResponseEntity<Booking> hostConfirmCheckOut(
        @PathVariable String id,
        @RequestParam String hostId
    ) {
        return ResponseEntity.ok(bookingService.hostConfirmCheckOut(id, hostId));
    }

    @PutMapping("/{id}/process-payment")
    public ResponseEntity<Booking> processPayment(
        @PathVariable String id,
        @RequestParam String paymentMethod
    ) {
        return ResponseEntity.ok(bookingService.processPayment(id, paymentMethod));
    }

    @PutMapping("/{id}/approve-payment")
    public ResponseEntity<Booking> approvePayment(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.approvePayment(id));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Booking> completeBooking(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, BookingStatus.COMPLETED));
    }

    @PutMapping("/{id}/refund")
    public ResponseEntity<Booking> refundBooking(
        @PathVariable String id,
        @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(bookingService.refundBooking(id, reason));
    }

    @PutMapping("/{id}/payout")
    public ResponseEntity<Booking> issuePayout(@PathVariable String id) {
        return ResponseEntity.ok(bookingService.issuePayout(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Booking> updateBookingStatus(
        @PathVariable String id,
        @RequestParam BookingStatus status
    ) {
        return ResponseEntity.ok(
            bookingService.updateBookingStatus(id, status)
        );
    }

    @PutMapping("/{id}/payment-status")
    public ResponseEntity<Booking> updatePaymentStatus(
        @PathVariable String id,
        @RequestParam PaymentStatus status
    ) {
        return ResponseEntity.ok(
            bookingService.updatePaymentStatus(id, status)
        );
    }
}
