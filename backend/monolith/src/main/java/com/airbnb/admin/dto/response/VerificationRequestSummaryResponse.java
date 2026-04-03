package com.airbnb.admin.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VerificationRequestSummaryResponse {

    private String notificationId;
    private String notificationStatus;
    private String userId;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String verificationStatus;
    private boolean emailVerified;
    private boolean canBook;
    private boolean canHost;
    private String profileImage;
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
    private String hostDisplayName;
    private String hostAbout;
    private String preferredCheckInTime;
    private String preferredCheckOutTime;
    private Integer responseTimeHours;
    private String houseRules;
    private List<String> propertyTypesOffered;
    private List<String> offeringHighlights;
    private List<String> hostPortfolioImages;
    private LocalDateTime verificationRequestedAt;
    private LocalDateTime notificationCreatedAt;
    private String notificationMessage;
}
