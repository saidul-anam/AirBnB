package com.airbnb.review.service;

import com.airbnb.review.model.Review;
import com.airbnb.review.model.ReviewStatus;
import com.airbnb.review.repository.ReviewRepository;
import com.airbnb.user.service.UserService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserService userService;

    public Review createReview(Review review) {
        // Check if review already exists for this booking
        if (reviewRepository.existsByBookingId(review.getBookingId())) {
            throw new RuntimeException("Review already exists for this booking");
        }

        review.setStatus(ReviewStatus.APPROVED); // Auto-approve for now
        review.setCreatedAt(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());
        review.setHelpfulCount(0);
        
        Review saved = reviewRepository.save(review);
        updateHostRating(saved.getHostId());
        return saved;
    }

    public Review getReview(String id) {
        return reviewRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Review not found"));
    }

    public List<Review> getReviewsByHost(String hostId) {
        return reviewRepository.findByHostIdAndStatus(hostId, ReviewStatus.APPROVED);
    }

    public List<Review> getReviewsByGuest(String guestId) {
        return reviewRepository.findByGuestId(guestId);
    }

    public List<Review> getReviewsByProperty(String propertyId) {
        return reviewRepository.findByPropertyIdAndStatus(propertyId, ReviewStatus.APPROVED);
    }

    public Review addHostResponse(String reviewId, String response) {
        Review review = getReview(reviewId);
        review.setHostResponse(response);
        review.setHostResponseDate(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    public Review markHelpful(String reviewId, String userId) {
        Review review = getReview(reviewId);
        if (review.getHelpfulByUserIds() == null) {
            review.setHelpfulByUserIds(new ArrayList<>());
        }
        
        int delta = 0;
        if (review.getHelpfulByUserIds().contains(userId)) {
            review.getHelpfulByUserIds().remove(userId);
            delta = -1;
        } else {
            review.getHelpfulByUserIds().add(userId);
            delta = 1;
        }
        
        int currentCount = review.getHelpfulCount() == null ? 0 : review.getHelpfulCount();
        review.setHelpfulCount(Math.max(0, currentCount + delta));
        
        review.setUpdatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    public List<Review> getPendingReviews() {
        return reviewRepository.findByStatus(ReviewStatus.PENDING);
    }

    public Review approveReview(String reviewId) {
        Review review = getReview(reviewId);
        review.setStatus(ReviewStatus.APPROVED);
        review.setUpdatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        updateHostRating(saved.getHostId());
        return saved;
    }

    public Review rejectReview(String reviewId) {
        Review review = getReview(reviewId);
        review.setStatus(ReviewStatus.REJECTED);
        review.setUpdatedAt(LocalDateTime.now());
        Review saved = reviewRepository.save(review);
        updateHostRating(saved.getHostId());
        return saved;
    }

    private void updateHostRating(String hostId) {
        List<Review> approvedReviews = getReviewsByHost(hostId);
        if (approvedReviews.isEmpty()) return;
        
        double overallSum = 0.0;
        double cleanlinessSum = 0.0;
        double accuracySum = 0.0;
        double checkInSum = 0.0;
        double communicationSum = 0.0;
        double locationSum = 0.0;
        double valueSum = 0.0;
        int count = 0;

        for (Review r : approvedReviews) {
            if (r.getOverallRating() != null) {
                overallSum += r.getOverallRating();
                cleanlinessSum += (r.getCleanlinessRating() != null ? r.getCleanlinessRating() : r.getOverallRating());
                accuracySum += (r.getAccuracyRating() != null ? r.getAccuracyRating() : r.getOverallRating());
                checkInSum += (r.getCheckInRating() != null ? r.getCheckInRating() : r.getOverallRating());
                communicationSum += (r.getCommunicationRating() != null ? r.getCommunicationRating() : r.getOverallRating());
                locationSum += (r.getLocationRating() != null ? r.getLocationRating() : r.getOverallRating());
                valueSum += (r.getValueRating() != null ? r.getValueRating() : r.getOverallRating());
                count++;
            }
        }
        
        if (count == 0) return;

        double avg = overallSum / count;
        double avgClean = cleanlinessSum / count;
        double avgAcc = accuracySum / count;
        double avgCheck = checkInSum / count;
        double avgComm = communicationSum / count;
        double avgLoc = locationSum / count;
        double avgVal = valueSum / count;
        
        try {
            userService.updateHostRating(
                hostId, avg, count, avgClean, avgAcc, avgCheck, avgComm, avgLoc, avgVal
            );
        } catch (Exception e) {
            System.err.println("Failed to update host rating: " + e.getMessage());
        }
    }
}
