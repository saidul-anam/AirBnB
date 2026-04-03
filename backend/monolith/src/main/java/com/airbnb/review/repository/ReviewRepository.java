package com.airbnb.review.repository;

import com.airbnb.review.model.Review;
import com.airbnb.review.model.ReviewStatus;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByHostIdAndStatus(String hostId, ReviewStatus status);
    List<Review> findByGuestId(String guestId);
    List<Review> findByBookingId(String bookingId);
    List<Review> findByPropertyIdAndStatus(String propertyId, ReviewStatus status);
    List<Review> findByStatus(ReviewStatus status);
    boolean existsByBookingId(String bookingId);
}
