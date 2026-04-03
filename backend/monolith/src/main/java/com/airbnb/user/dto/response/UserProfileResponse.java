package com.airbnb.user.dto.response;

import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.UserStatus;
import com.airbnb.user.model.enums.VerificationStatus;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserProfileResponse {

    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String profileImage;
    private String bio;
    private List<String> favoriteHostIds;
    private Role role;
    private UserStatus status;
    private boolean emailVerified;
    private VerificationStatus verificationStatus;
    private LocalDateTime verificationRequestedAt;
    private LocalDateTime verifiedAt;
    private boolean canBook;
    private boolean canHost;

    // Address
    private String street;
    private String area;
    private String village;
    private String district;
    private String division;
    private String city;
    private String country;
    private String zipCode;
    private Double latitude;
    private Double longitude;

    // Host info
    private boolean superhost;
    private String hostDisplayName;
    private String hostAbout;
    private LocalDateTime hostingSince;
    private String preferredCheckInTime;
    private String preferredCheckOutTime;
    private Integer responseTimeHours;
    private String houseRules;
    private List<String> propertyTypesOffered;
    private List<String> offeringHighlights;
    private List<String> hostPortfolioImages;
    private Integer guestCapacity;
    private Integer bedCount;
    private List<String> bedTypes;
    private Double nightlyRateUsd;
    private boolean payLaterAllowed;
    private Double payoutPercentage;
    private String cancellationPolicy;
    private List<Object> hostedProperties;
    private Integer totalListings;
    private Double averageRating;
    private Integer reviewCount;
    private Double responseRate;

    private Double cleanlinessRating;
    private Double accuracyRating;
    private Double checkInRating;
    private Double communicationRating;
    private Double locationRating;
    private Double valueRating;

    private LocalDateTime lastLoginAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
