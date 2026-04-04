package com.airbnb.review.controller;

import com.airbnb.review.model.Review;
import com.airbnb.review.service.ReviewService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<Review> createReview(@RequestBody Review review) {
        return ResponseEntity.ok(reviewService.createReview(review));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Review> getReview(@PathVariable String id) {
        return ResponseEntity.ok(reviewService.getReview(id));
    }

    @GetMapping("/host/{hostId}")
    public ResponseEntity<List<Review>> getReviewsByHost(@PathVariable String hostId) {
        return ResponseEntity.ok(reviewService.getReviewsByHost(hostId));
    }

    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<Review>> getReviewsByGuest(@PathVariable String guestId) {
        return ResponseEntity.ok(reviewService.getReviewsByGuest(guestId));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<Review>> getReviewsByProperty(@PathVariable String propertyId) {
        return ResponseEntity.ok(reviewService.getReviewsByProperty(propertyId));
    }

    @PutMapping("/{id}/response")
    public ResponseEntity<Review> addHostResponse(
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        String response = body.get("response");
        return ResponseEntity.ok(reviewService.addHostResponse(id, response));
    }

    @PutMapping("/{id}/helpful")
    public ResponseEntity<Review> markHelpful(
        @PathVariable String id,
        @RequestParam String userId
    ) {
        return ResponseEntity.ok(reviewService.markHelpful(id, userId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Review>> getPendingReviews() {
        return ResponseEntity.ok(reviewService.getPendingReviews());
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Review> approveReview(@PathVariable String id) {
        return ResponseEntity.ok(reviewService.approveReview(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Review> rejectReview(@PathVariable String id) {
        return ResponseEntity.ok(reviewService.rejectReview(id));
    }
}
