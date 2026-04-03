package com.airbnb.review.seed;

import com.airbnb.review.model.Review;
import com.airbnb.review.model.ReviewStatus;
import com.airbnb.review.repository.ReviewRepository;
import com.airbnb.user.dto.response.UserProfileResponse;
import com.airbnb.user.service.UserService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReviewSeeder implements CommandLineRunner {

    private final ReviewRepository reviewRepository;
    private final UserService userService;

    @Override
    public void run(String... args) {
        if (reviewRepository.count() > 0) {
            log.info("Reviews already exist. Skipping seed.");
            return;
        }

        log.info("Seeding reviews...");
        Random random = new Random();

        List<String> validHostIds = new ArrayList<>();
        try {
            log.info("Fetching valid hosts from user-service");
            List<UserProfileResponse> hosts = userService.getHostSuggestions("", 0, 100).getContent();
            
            if (hosts != null && !hosts.isEmpty()) {
                validHostIds = hosts.stream()
                                    .map(UserProfileResponse::getUserId)
                                    .collect(Collectors.toList());
                log.info("Found {} valid hosts for seeding reviews", validHostIds.size());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch hosts from user-service: {}. Will use fallback host IDs.", e.getMessage());
        }

        if (validHostIds.isEmpty()) {
            for (int i = 0; i < 50; i++) {
                validHostIds.add("host_" + i);
            }
        }

        // Sample review texts
        List<String> positiveReviews = Arrays.asList(
            "Amazing stay! The place was exactly as described. Host was very responsive and helpful. Would definitely recommend!",
            "Perfect location and spotlessly clean. Everything we needed was provided. Great communication from the host.",
            "Wonderful experience! The property exceeded our expectations. Beautiful space and very comfortable.",
            "Fantastic host and lovely property. Check-in was smooth and the place was immaculate. Highly recommend!",
            "Great value for money. The location was perfect for exploring the area. Host was super friendly.",
            "Absolutely loved our stay! The property was clean, comfortable, and had everything we needed.",
            "Outstanding hospitality! The host went above and beyond to make our stay comfortable.",
            "Beautiful property in a great location. Everything was as described. Would stay again!",
            "Excellent stay! The place was clean, well-maintained, and in a perfect location.",
            "Highly recommend! Great communication, clean space, and wonderful amenities."
        );

        List<String> goodReviews = Arrays.asList(
            "Nice place overall. A few minor issues but nothing major. Host was responsive.",
            "Good stay. The location was convenient and the place was clean.",
            "Decent property. Met our needs for the trip. Would consider staying again.",
            "Pleasant experience. The host was helpful and the place was comfortable.",
            "Good value. The property was as described and served its purpose well."
        );

        List<String> mixedReviews = Arrays.asList(
            "The location was great but the place could use some updates. Host was nice though.",
            "Overall okay. Some things were great, others could be improved.",
            "Mixed feelings. Good location but had some cleanliness issues.",
            "Decent stay. The property has potential but needs some maintenance."
        );

        List<String> hostResponses = Arrays.asList(
            "Thank you so much for your kind words! We're thrilled you enjoyed your stay. Hope to host you again soon!",
            "We appreciate your feedback! So glad you had a great experience. You're welcome back anytime!",
            "Thanks for staying with us! Your review made our day. Looking forward to hosting you again!",
            "Thank you for the wonderful review! We're happy everything met your expectations.",
            "We're so pleased you enjoyed your stay! Thank you for being such great guests!",
            "Thanks for your feedback! We're always working to improve and appreciate your comments.",
            "Thank you for your review. We're glad you enjoyed the location and we'll address the points you mentioned.",
            "We appreciate your honest feedback and are working on the improvements you suggested."
        );

        List<String> guestNames = Arrays.asList(
            "Sarah", "Michael", "Emma", "James", "Olivia", "William", "Ava", "Benjamin",
            "Sophia", "Lucas", "Isabella", "Henry", "Mia", "Alexander", "Charlotte", "Daniel",
            "Amelia", "Matthew", "Harper", "David", "Evelyn", "Joseph", "Abigail", "Samuel"
        );

        List<List<String>> categoryMentions = Arrays.asList(
            Arrays.asList("Cleanliness", "Hospitality", "Location"),
            Arrays.asList("Cleanliness", "Accuracy", "Communication"),
            Arrays.asList("Location", "Value", "Check-in"),
            Arrays.asList("Hospitality", "Kitchen", "Access"),
            Arrays.asList("Cleanliness", "Location", "Accuracy"),
            Arrays.asList("Communication", "Value", "Hospitality")
        );

        // Generate 200 reviews
        for (int i = 0; i < 200; i++) {
            double overallRating = 4.0 + random.nextDouble() * 1.0; // 4.0 to 5.0
            
            String reviewText;
            if (overallRating >= 4.7) {
                reviewText = positiveReviews.get(random.nextInt(positiveReviews.size()));
            } else if (overallRating >= 4.3) {
                reviewText = goodReviews.get(random.nextInt(goodReviews.size()));
            } else {
                reviewText = mixedReviews.get(random.nextInt(mixedReviews.size()));
            }

            // Generate category ratings around the overall rating
            double variance = 0.3;
            double cleanlinessRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));
            double accuracyRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));
            double checkInRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));
            double communicationRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));
            double locationRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));
            double valueRating = Math.min(5.0, Math.max(3.5, overallRating + (random.nextDouble() - 0.5) * variance));

            String guestName = guestNames.get(random.nextInt(guestNames.size()));
            boolean hasHostResponse = random.nextDouble() < 0.7; // 70% have host responses
            boolean isGuestFavorite = overallRating >= 4.8 && random.nextDouble() < 0.3;
            
            int helpfulCount = random.nextInt(20);
            List<String> helpfulByUserIds = new ArrayList<>();
            for (int j = 0; j < helpfulCount; j++) {
                helpfulByUserIds.add("user_" + random.nextInt(1000));
            }

            Review review = Review.builder()
                .bookingId("booking_" + i)
                .guestId("guest_" + random.nextInt(100))
                .hostId(validHostIds.get(random.nextInt(validHostIds.size())))
                .propertyId("property_" + random.nextInt(50))
                .overallRating(Math.round(overallRating * 100.0) / 100.0)
                .cleanlinessRating(Math.round(cleanlinessRating * 100.0) / 100.0)
                .accuracyRating(Math.round(accuracyRating * 100.0) / 100.0)
                .checkInRating(Math.round(checkInRating * 100.0) / 100.0)
                .communicationRating(Math.round(communicationRating * 100.0) / 100.0)
                .locationRating(Math.round(locationRating * 100.0) / 100.0)
                .valueRating(Math.round(valueRating * 100.0) / 100.0)
                .reviewText(reviewText)
                .guestName(guestName)
                .guestProfileImage(null)
                .hostResponse(hasHostResponse ? hostResponses.get(random.nextInt(hostResponses.size())) : null)
                .hostResponseDate(hasHostResponse ? LocalDateTime.now().minusDays(random.nextInt(30)) : null)
                .status(ReviewStatus.APPROVED)
                .isGuestFavorite(isGuestFavorite)
                .helpfulCount(helpfulCount)
                .helpfulByUserIds(helpfulByUserIds)
                .mentionedCategories(categoryMentions.get(random.nextInt(categoryMentions.size())))
                .createdAt(LocalDateTime.now().minusDays(random.nextInt(365)))
                .updatedAt(LocalDateTime.now().minusDays(random.nextInt(30)))
                .build();

            reviewRepository.save(review);
        }

        log.info("Seeded 200 reviews successfully!");
    }
}
