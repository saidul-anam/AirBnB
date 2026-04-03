package com.airbnb.review.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
@Document(collection = "reviews")
public class Review {
    @Id
    private String id;
    
    private String bookingId;
    private String guestId;
    private String hostId;
    private String propertyId;
    
    // Overall rating
    private Double overallRating;
    
    // Category ratings (out of 5.0)
    private Double cleanlinessRating;
    private Double accuracyRating;
    private Double checkInRating;
    private Double communicationRating;
    private Double locationRating;
    private Double valueRating;
    
    // Review content
    private String reviewText;
    private String guestName;
    private String guestProfileImage;
    
    // Host response
    private String hostResponse;
    private LocalDateTime hostResponseDate;
    
    // Review metadata
    private ReviewStatus status; // PENDING, APPROVED, REJECTED
    private boolean isGuestFavorite; // If this property became a guest favorite
    
    // Helpful votes
    private Integer helpfulCount;
    @Builder.Default
    private List<String> helpfulByUserIds = new ArrayList<>();
    
    // Review categories mentioned
    @Builder.Default
    private List<String> mentionedCategories = new ArrayList<>(); // e.g., "Cleanliness", "Hospitality", "Location"
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
