package com.airbnb.user.dto.request;

import com.airbnb.user.model.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phoneNumber;
    private String profileImage;
    private String bio;
    private List<String> favoriteHostIds = new ArrayList<>();
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

    private Role role = Role.GUEST;

    private String hostDisplayName;
    private String hostAbout;
    private String hostingSince;
    private String preferredCheckInTime;
    private String preferredCheckOutTime;
    private Integer responseTimeHours;
    private String houseRules;

    private List<String> propertyTypesOffered = new ArrayList<>();
    private List<String> offeringHighlights = new ArrayList<>();
    private List<String> hostPortfolioImages = new ArrayList<>();
    private Integer guestCapacity;
    private Integer bedCount;
    private List<String> bedTypes = new ArrayList<>();
    private Double nightlyRateUsd;
}
