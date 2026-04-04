package com.airbnb.user.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostedProperty {

    @Builder.Default
    private String propertyId = UUID.randomUUID().toString();

    private String propertyName;
    private String propertyType; // Apartment, Home, Hotel, Villa, etc.
    private String description;

    // Address
    private String street;
    private String area;
    private String district;
    private String city;
    private String country;

    // Details
    private Integer guestCapacity;
    private Integer bedCount;

    @Builder.Default
    private List<String> bedTypes = new ArrayList<>();

    private Double nightlyRateUsd;

    @Builder.Default
    private List<String> amenities = new ArrayList<>();

    @Builder.Default
    private List<String> images = new ArrayList<>();

    @Builder.Default
    private boolean payLaterAllowed = false;

    // Booking capacity for this specific property (1-5)
    @Builder.Default
    private Integer bookingCapacity = 1;

    // Cancellation policy: FLEXIBLE, MODERATE, STRICT
    @Builder.Default
    private String cancellationPolicy = "MODERATE";

    // Property Review Scores
    private Double averageRating;
    private Integer reviewCount;
    private Double cleanlinessRating;
    private Double accuracyRating;
    private Double checkInRating;
    private Double communicationRating;
    private Double locationRating;
    private Double valueRating;

    // What this place offers (expanded amenities)
    @Builder.Default
    private List<String> essentials = new ArrayList<>();  // Kitchen, Wifi, TV, etc.
    
    @Builder.Default
    private List<String> features = new ArrayList<>();    // Pool, Gym, Parking, etc.
    
    @Builder.Default
    private List<String> safety = new ArrayList<>();      // Smoke alarm, First aid kit, etc.
}
