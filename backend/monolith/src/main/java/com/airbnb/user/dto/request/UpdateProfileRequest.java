package com.airbnb.user.dto.request;

import java.util.List;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String profileImage;
    private String bio;
    private List<String> favoriteHostIds;
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
    private String hostingSince;
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
}
