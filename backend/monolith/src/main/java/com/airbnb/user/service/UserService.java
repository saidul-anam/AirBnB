package com.airbnb.user.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.airbnb.notification.dto.request.CreateNotificationRequest;
import com.airbnb.user.dto.request.ForgotPasswordRequest;
import com.airbnb.user.dto.request.LoginRequest;
import com.airbnb.user.dto.request.RegisterRequest;
import com.airbnb.user.dto.request.UpdateProfileRequest;
import com.airbnb.user.dto.response.AuthResponse;
import com.airbnb.user.dto.response.UserAccessResponse;
import com.airbnb.user.dto.response.UserProfileResponse;
import com.airbnb.user.dto.response.VerificationResponse;
import com.airbnb.user.exception.InvalidCredentialsException;
import com.airbnb.user.exception.UserAlreadyExistsException;
import com.airbnb.user.exception.UserNotFoundException;
import com.airbnb.user.model.User;
import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.UserStatus;
import com.airbnb.user.model.enums.VerificationStatus;
import com.airbnb.user.security.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserPersistenceService userPersistenceService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final com.airbnb.notification.service.NotificationService notificationService;
    private final SupabaseStorageService supabaseStorageService;

    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase().trim();
        if (userPersistenceService.existsByEmail(normalizedEmail)) {
            throw new UserAlreadyExistsException(
                "An account with email " +
                    request.getEmail() +
                    " already exists."
            );
        }

        validateRegistrationRequest(request);

        String targetBucket = request.getRole() == Role.HOST ? "host" : "guest";
        String uploadedProfileImage = supabaseStorageService.uploadBase64Image(request.getProfileImage(), targetBucket);

        User user = User.builder()
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .email(normalizedEmail)
            .password(passwordEncoder.encode(request.getPassword()))
            .phoneNumber(request.getPhoneNumber())
            .profileImage(uploadedProfileImage)
            .bio(request.getBio())
            .favoriteHostIds(cleanList(request.getFavoriteHostIds()))
            .street(blankToNull(request.getStreet()))
            .area(blankToNull(request.getArea()))
            .village(blankToNull(request.getVillage()))
            .district(blankToNull(request.getDistrict()))
            .division(blankToNull(request.getDivision()))
            .city(blankToNull(request.getCity()))
            .country(blankToNull(request.getCountry()))
            .zipCode(blankToNull(request.getZipCode()))
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .role(request.getRole() != null ? request.getRole() : Role.GUEST)
            .status(UserStatus.ACTIVE)
            .emailVerified(false)
            .verificationStatus(VerificationStatus.PENDING)
            .hostDisplayName(blankToNull(request.getHostDisplayName()))
            .hostAbout(blankToNull(request.getHostAbout()))
            .hostingSince(parseLocalDateTimeOrNull(request.getHostingSince()))
            .preferredCheckInTime(
                blankToNull(request.getPreferredCheckInTime())
            )
            .preferredCheckOutTime(
                blankToNull(request.getPreferredCheckOutTime())
            )
            .responseTimeHours(request.getResponseTimeHours())
            .houseRules(blankToNull(request.getHouseRules()))
            .propertyTypesOffered(cleanList(request.getPropertyTypesOffered()))
            .offeringHighlights(cleanList(request.getOfferingHighlights()))
            .hostPortfolioImages(cleanList(request.getHostPortfolioImages()).stream()
                .map(img -> supabaseStorageService.uploadBase64Image(img, "hostproperties"))
                .collect(Collectors.toList()))
            .guestCapacity(request.getGuestCapacity())
            .bedCount(request.getBedCount())
            .bedTypes(cleanList(request.getBedTypes()))
            .nightlyRateUsd(request.getNightlyRateUsd())
            .reviewCount(0)
            .verificationRequestedAt(LocalDateTime.now())
            .build();

        User saved = userPersistenceService.save(user);
        log.info(
            "New user registered: {} [{}]",
            saved.getEmail(),
            saved.getRole()
        );

        String token = jwtUtil.generateToken(
            saved.getUserId(),
            saved.getEmail(),
            saved.getRole()
        );
        createVerificationNotifications(saved);

        return AuthResponse.builder()
            .token(token)
            .userId(saved.getUserId())
            .email(saved.getEmail())
            .firstName(saved.getFirstName())
            .lastName(saved.getLastName())
            .role(saved.getRole())
            .profileImage(saved.getProfileImage())
            .emailVerified(saved.isEmailVerified())
            .verificationStatus(saved.getVerificationStatus())
            .canBook(canBook(saved))
            .canHost(canHost(saved))
            .favoriteHostIds(saved.getFavoriteHostIds())
            .message(
                "Registration successful. Your account verification request has been sent for admin review."
            )
            .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userPersistenceService
            .findByEmail(request.getEmail().toLowerCase().trim())
            .orElseThrow(() ->
                new InvalidCredentialsException("Invalid email or password.")
            );

        if (
            !passwordEncoder.matches(request.getPassword(), user.getPassword())
        ) {
            throw new InvalidCredentialsException("Invalid email or password.");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new InvalidCredentialsException(
                "Your account has been suspended. Please contact support."
            );
        }

        if (user.getStatus() == UserStatus.DELETED) {
            throw new InvalidCredentialsException("Account not found.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userPersistenceService.save(user);

        String token = jwtUtil.generateToken(
            user.getUserId(),
            user.getEmail(),
            user.getRole()
        );
        log.info("User logged in: {}", user.getEmail());

        return AuthResponse.builder()
            .token(token)
            .userId(user.getUserId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .profileImage(user.getProfileImage())
            .emailVerified(user.isEmailVerified())
            .verificationStatus(user.getVerificationStatus())
            .canBook(canBook(user))
            .canHost(canHost(user))
            .favoriteHostIds(user.getFavoriteHostIds())
            .message(
                user.isEmailVerified()
                    ? "Login successful. Welcome back, " +
                      user.getFirstName() +
                      "!"
                    : "Login successful. Your account verification is pending admin approval."
            )
            .build();
    }

    public VerificationResponse verifyEmail(String token) {
        return VerificationResponse.builder()
            .success(false)
            .message(
                "Direct email-link verification is disabled. Account verification is now approved by an admin through the notification workflow."
            )
            .build();
    }

    public VerificationResponse resetPassword(ForgotPasswordRequest request) {
        // Validate passwords match
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return VerificationResponse.builder()
                .success(false)
                .message("New password and confirm password do not match.")
                .build();
        }

        String normalizedEmail = request.getEmail().toLowerCase().trim();

        // Find user by email and phone number
        var userOpt = userPersistenceService.findByEmailAndPhoneNumber(
            normalizedEmail, request.getPhoneNumber()
        );

        if (userOpt.isEmpty()) {
            return VerificationResponse.builder()
                .success(false)
                .message("No account found with the provided email and phone number combination.")
                .build();
        }

        User user = userOpt.get();

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userPersistenceService.save(user);

        log.info("Password reset successful for user: {}", user.getEmail());

        return VerificationResponse.builder()
            .success(true)
            .message("Password has been reset successfully. You can now log in with your new password.")
            .build();
    }

    public VerificationResponse resendVerificationEmail(String email) {
        User user = userPersistenceService
            .findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found."));

        if (user.isEmailVerified()) {
            return VerificationResponse.builder()
                .success(true)
                .message("Email is already verified.")
                .build();
        }

        user.setVerificationStatus(VerificationStatus.PENDING);
        user.setVerificationRequestedAt(LocalDateTime.now());
        userPersistenceService.save(user);
        createVerificationNotifications(user);

        return VerificationResponse.builder()
            .success(true)
            .message("Verification request sent to admin for review.")
            .build();
    }

    public VerificationResponse approveVerification(
        String userId,
        String note
    ) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found."));

        user.setEmailVerified(true);
        user.setVerificationStatus(VerificationStatus.APPROVED);
        user.setVerifiedAt(LocalDateTime.now());
        userPersistenceService.save(user);

        createUserNotification(
            user,
            "Account verified",
            "Your account has been verified by an admin. You can continue with future booking and hosting flows.",
            "ACCOUNT_VERIFICATION_APPROVED",
            "UNREAD",
            note
        );

        return VerificationResponse.builder()
            .success(true)
            .message("User verification approved successfully.")
            .build();
    }

    public VerificationResponse rejectVerification(String userId, String note) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found."));

        user.setEmailVerified(false);
        user.setVerificationStatus(VerificationStatus.REJECTED);
        userPersistenceService.save(user);

        createUserNotification(
            user,
            "Verification needs changes",
            "Your verification request was reviewed and needs updates before approval.",
            "ACCOUNT_VERIFICATION_REJECTED",
            "UNREAD",
            note
        );

        return VerificationResponse.builder()
            .success(true)
            .message("User verification rejected successfully.")
            .build();
    }

    public UserProfileResponse getProfile(String email) {
        User user = userPersistenceService
            .findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found."));
        return mapToProfileResponse(user);
    }

    public UserProfileResponse getProfileByUserId(String userId) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() ->
                new UserNotFoundException("User not found with id: " + userId)
            );
        return mapToProfileResponse(user);
    }

    public UserAccessResponse getAccessProfile(String email) {
        User user = userPersistenceService
            .findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found."));
        return mapToAccessResponse(user);
    }

    public UserAccessResponse getAccessProfileByUserId(String userId) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found."));
        return mapToAccessResponse(user);
    }

    public UserProfileResponse updateProfile(
        String email,
        UpdateProfileRequest request
    ) {
        User user = userPersistenceService
            .findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found."));

        if (request.getFirstName() != null) user.setFirstName(
            request.getFirstName()
        );
        if (request.getLastName() != null) user.setLastName(
            request.getLastName()
        );
        if (request.getPhoneNumber() != null) user.setPhoneNumber(
            request.getPhoneNumber()
        );
        if (request.getProfileImage() != null) {
            String targetBucket = user.getRole() == Role.HOST ? "host" : "guest";
            user.setProfileImage(supabaseStorageService.uploadBase64Image(request.getProfileImage(), targetBucket));
        }
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getFavoriteHostIds() != null) {
            user.setFavoriteHostIds(cleanList(request.getFavoriteHostIds()));
        }
        if (request.getStreet() != null) user.setStreet(request.getStreet());
        if (request.getArea() != null) user.setArea(
            blankToNull(request.getArea())
        );
        if (request.getVillage() != null) user.setVillage(
            blankToNull(request.getVillage())
        );
        if (request.getDistrict() != null) user.setDistrict(
            blankToNull(request.getDistrict())
        );
        if (request.getDivision() != null) user.setDivision(
            blankToNull(request.getDivision())
        );
        if (request.getCity() != null) user.setCity(request.getCity());
        if (request.getCountry() != null) user.setCountry(request.getCountry());
        if (request.getZipCode() != null) user.setZipCode(request.getZipCode());
        if (request.getLatitude() != null) user.setLatitude(
            request.getLatitude()
        );
        if (request.getLongitude() != null) user.setLongitude(
            request.getLongitude()
        );

        if (request.getHostDisplayName() != null) user.setHostDisplayName(
            blankToNull(request.getHostDisplayName())
        );
        if (request.getHostAbout() != null) user.setHostAbout(
            blankToNull(request.getHostAbout())
        );
        if (request.getHostingSince() != null) user.setHostingSince(
            parseLocalDateTimeOrNull(request.getHostingSince())
        );
        if (
            request.getPreferredCheckInTime() != null
        ) user.setPreferredCheckInTime(
            blankToNull(request.getPreferredCheckInTime())
        );
        if (
            request.getPreferredCheckOutTime() != null
        ) user.setPreferredCheckOutTime(
            blankToNull(request.getPreferredCheckOutTime())
        );
        if (request.getResponseTimeHours() != null) user.setResponseTimeHours(
            request.getResponseTimeHours()
        );
        if (request.getHouseRules() != null) user.setHouseRules(
            blankToNull(request.getHouseRules())
        );
        if (
            request.getPropertyTypesOffered() != null
        ) user.setPropertyTypesOffered(
            cleanList(request.getPropertyTypesOffered())
        );
        if (request.getOfferingHighlights() != null) user.setOfferingHighlights(
            cleanList(request.getOfferingHighlights())
        );
        if (request.getHostPortfolioImages() != null) {
            user.setHostPortfolioImages(cleanList(request.getHostPortfolioImages()).stream()
                .map(img -> supabaseStorageService.uploadBase64Image(img, "hostproperties"))
                .collect(Collectors.toList()));
        }
        if (request.getGuestCapacity() != null) user.setGuestCapacity(
            request.getGuestCapacity()
        );
        if (request.getBedCount() != null) user.setBedCount(
            request.getBedCount()
        );
        if (request.getBedTypes() != null) user.setBedTypes(
            cleanList(request.getBedTypes())
        );
        if (request.getNightlyRateUsd() != null) user.setNightlyRateUsd(
            request.getNightlyRateUsd()
        );

        validateHostProfile(user);
        normalizeGuestOnlyFields(user);

        User updated = userPersistenceService.save(user);
        log.info("Profile updated for: {}", email);
        return mapToProfileResponse(updated);
    }

    public void changePassword(
        String email,
        String currentPassword,
        String newPassword
    ) {
        User user = userPersistenceService
            .findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException("User not found."));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new InvalidCredentialsException(
                "Current password is incorrect."
            );
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userPersistenceService.save(user);
        log.info("Password changed for: {}", email);
    }

    public void updateHostRating(
        String hostId, Double averageRating, Integer reviewCount,
        Double cleanlinessRating, Double accuracyRating, Double checkInRating,
        Double communicationRating, Double locationRating, Double valueRating
    ) {
        User user = userPersistenceService
            .findByUserId(hostId)
            .orElseThrow(() -> new UserNotFoundException("Host not found."));
        if (user.getRole() == Role.HOST) {
            user.setAverageRating(averageRating);
            if (reviewCount != null) user.setReviewCount(reviewCount);
            if (cleanlinessRating != null) user.setCleanlinessRating(cleanlinessRating);
            if (accuracyRating != null) user.setAccuracyRating(accuracyRating);
            if (checkInRating != null) user.setCheckInRating(checkInRating);
            if (communicationRating != null) user.setCommunicationRating(communicationRating);
            if (locationRating != null) user.setLocationRating(locationRating);
            if (valueRating != null) user.setValueRating(valueRating);
            
            userPersistenceService.save(user);
            log.info("Updated ratings for host {}: avg={}, reviews={}", hostId, averageRating, reviewCount);
        }
    }

    public List<UserProfileResponse> getAllUsers() {
        return userPersistenceService
            .findAll()
            .stream()
            .map(this::mapToProfileResponse)
            .collect(Collectors.toList());
    }

    public Page<UserProfileResponse> getHostSuggestions(
        String location,
        int page,
        int limit
    ) {
        return userPersistenceService
            .findHosts(location, page, limit)
            .map(this::mapToProfileResponse);
    }

    public void suspendUser(String userId) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found."));
        user.setStatus(UserStatus.SUSPENDED);
        userPersistenceService.save(user);
        log.info("User suspended: {}", userId);
    }

    public void activateUser(String userId) {
        User user = userPersistenceService
            .findByUserId(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found."));
        user.setStatus(UserStatus.ACTIVE);
        userPersistenceService.save(user);
        log.info("User activated: {}", userId);
    }

    private void validateRegistrationRequest(RegisterRequest request) {
        if (request.getRole() == Role.HOST) {
            requireField(
                request.getPhoneNumber(),
                "Phone number is required for hosts."
            );
            requireField(
                request.getProfileImage(),
                "Profile image is required for hosts."
            );
            requireField(
                request.getHostDisplayName(),
                "Host display name is required."
            );
            requireField(
                request.getHostAbout(),
                "Host introduction is required."
            );
            requireField(
                request.getPreferredCheckInTime(),
                "Preferred check-in time is required for hosts."
            );
            requireField(
                request.getPreferredCheckOutTime(),
                "Preferred check-out time is required for hosts."
            );
            requireField(
                request.getHouseRules(),
                "House rules are required for hosts."
            );
            requireField(
                request.getStreet(),
                "Street address is required for hosts."
            );
            requireField(request.getArea(), "Area is required for hosts.");
            requireField(
                request.getDistrict(),
                "District is required for hosts."
            );
            requireField(
                request.getDivision(),
                "Division is required for hosts."
            );
            requireField(
                request.getCountry(),
                "Country is required for hosts."
            );
            requireCoordinate(
                request.getLatitude(),
                "Host location pin is required."
            );
            requireCoordinate(
                request.getLongitude(),
                "Host location pin is required."
            );

            if (cleanList(request.getPropertyTypesOffered()).isEmpty()) {
                throw new InvalidCredentialsException(
                    "Hosts must provide at least one property type."
                );
            }
            if (cleanList(request.getOfferingHighlights()).isEmpty()) {
                throw new InvalidCredentialsException(
                    "Hosts must provide at least one offering highlight."
                );
            }
            if (cleanList(request.getHostPortfolioImages()).isEmpty()) {
                throw new InvalidCredentialsException(
                    "Hosts must upload at least one room or hosting image."
                );
            }
            if (
                request.getGuestCapacity() == null ||
                request.getGuestCapacity() < 1
            ) {
                throw new InvalidCredentialsException(
                    "Hosts must provide guest capacity."
                );
            }
            if (request.getBedCount() == null || request.getBedCount() < 1) {
                throw new InvalidCredentialsException(
                    "Hosts must provide bed count."
                );
            }
            if (cleanList(request.getBedTypes()).isEmpty()) {
                throw new InvalidCredentialsException(
                    "Hosts must provide at least one bed type."
                );
            }
            if (
                request.getNightlyRateUsd() == null ||
                request.getNightlyRateUsd() <= 0
            ) {
                throw new InvalidCredentialsException(
                    "Hosts must provide a nightly rate in USD."
                );
            }
        }
    }

    private void validateHostProfile(User user) {
        if (user.getRole() != Role.HOST) {
            return;
        }

        requireField(
            user.getPhoneNumber(),
            "Hosts must keep a phone number on file."
        );
        requireField(
            user.getProfileImage(),
            "Hosts must keep a profile image on file."
        );
        requireField(
            user.getHostDisplayName(),
            "Hosts must keep a host display name."
        );
        requireField(
            user.getHostAbout(),
            "Hosts must keep a host introduction."
        );
        requireField(
            user.getPreferredCheckInTime(),
            "Hosts must keep a preferred check-in time."
        );
        requireField(
            user.getPreferredCheckOutTime(),
            "Hosts must keep a preferred check-out time."
        );
        requireField(user.getStreet(), "Hosts must keep a street address.");
        requireField(user.getArea(), "Hosts must keep an area.");
        requireField(user.getDistrict(), "Hosts must keep a district.");
        requireField(user.getDivision(), "Hosts must keep a division.");
        requireField(user.getCountry(), "Hosts must keep a country.");
        requireCoordinate(
            user.getLatitude(),
            "Hosts must keep a map location."
        );
        requireCoordinate(
            user.getLongitude(),
            "Hosts must keep a map location."
        );

        if (
            user.getPropertyTypesOffered() == null ||
            user.getPropertyTypesOffered().isEmpty()
        ) {
            throw new InvalidCredentialsException(
                "Hosts must keep at least one property type."
            );
        }
        if (
            user.getOfferingHighlights() == null ||
            user.getOfferingHighlights().isEmpty()
        ) {
            throw new InvalidCredentialsException(
                "Hosts must keep at least one offering highlight."
            );
        }
        if (user.getGuestCapacity() == null || user.getGuestCapacity() < 1) {
            throw new InvalidCredentialsException(
                "Hosts must keep guest capacity."
            );
        }
        if (user.getBedCount() == null || user.getBedCount() < 1) {
            throw new InvalidCredentialsException("Hosts must keep bed count.");
        }
        if (user.getBedTypes() == null || user.getBedTypes().isEmpty()) {
            throw new InvalidCredentialsException(
                "Hosts must keep at least one bed type."
            );
        }
        if (user.getNightlyRateUsd() == null || user.getNightlyRateUsd() <= 0) {
            throw new InvalidCredentialsException(
                "Hosts must keep a nightly rate in USD."
            );
        }
    }

    private void normalizeGuestOnlyFields(User user) {
        // Removed to allow all roles to have wishlists
    }

    private void createVerificationNotifications(User user) {
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientRole("ADMIN")
                .title("New account verification request")
                .message(
                    "Review verification for " +
                        user.getFirstName() +
                        " " +
                        user.getLastName() +
                        " (" +
                        user.getEmail() +
                        "), role: " +
                        user.getRole()
                )
                .type("ACCOUNT_VERIFICATION_REQUEST")
                .actionTargetUserId(user.getUserId())
                .status("OPEN")
                .build()
        );

        createUserNotification(
            user,
            "Verification request submitted",
            "Your account verification request has been submitted and is waiting for admin approval.",
            "ACCOUNT_VERIFICATION_PENDING",
            "UNREAD",
            null
        );
    }

    private void createUserNotification(
        User user,
        String title,
        String message,
        String type,
        String status,
        String note
    ) {
        notificationService.createInternalNotification(
            CreateNotificationRequest.builder()
                .recipientUserId(user.getUserId())
                .title(title)
                .message(message)
                .type(type)
                .actionTargetUserId(user.getUserId())
                .status(status)
                .resolutionNote(blankToNull(note))
                .build()
        );
    }

    private void requireField(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new InvalidCredentialsException(message);
        }
    }

    private void requireCoordinate(Double value, String message) {
        if (value == null) {
            throw new InvalidCredentialsException(message);
        }
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private List<String> cleanList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values
            .stream()
            .filter(StringUtils::hasText)
            .map(String::trim)
            .toList();
    }

    private LocalDateTime parseLocalDateTimeOrNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return LocalDate.parse(value).atStartOfDay();
    }

    private UserProfileResponse mapToProfileResponse(User user) {
        return UserProfileResponse.builder()
            .userId(user.getUserId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phoneNumber(user.getPhoneNumber())
            .profileImage(user.getProfileImage())
            .bio(user.getBio())
            .favoriteHostIds(user.getFavoriteHostIds())
            .role(user.getRole())
            .status(user.getStatus())
            .emailVerified(user.isEmailVerified())
            .verificationStatus(user.getVerificationStatus())
            .verificationRequestedAt(user.getVerificationRequestedAt())
            .verifiedAt(user.getVerifiedAt())
            .canBook(canBook(user))
            .canHost(canHost(user))
            .street(user.getStreet())
            .area(user.getArea())
            .village(user.getVillage())
            .district(user.getDistrict())
            .division(user.getDivision())
            .city(user.getCity())
            .country(user.getCountry())
            .zipCode(user.getZipCode())
            .latitude(user.getLatitude())
            .longitude(user.getLongitude())
            .superhost(user.isSuperhost())
            .hostDisplayName(user.getHostDisplayName())
            .hostAbout(user.getHostAbout())
            .hostingSince(user.getHostingSince())
            .preferredCheckInTime(user.getPreferredCheckInTime())
            .preferredCheckOutTime(user.getPreferredCheckOutTime())
            .responseTimeHours(user.getResponseTimeHours())
            .houseRules(user.getHouseRules())
            .propertyTypesOffered(user.getPropertyTypesOffered())
            .offeringHighlights(user.getOfferingHighlights())
            .hostPortfolioImages(user.getHostPortfolioImages())
            .guestCapacity(user.getGuestCapacity())
            .bedCount(user.getBedCount())
            .bedTypes(user.getBedTypes())
            .nightlyRateUsd(user.getNightlyRateUsd())
            .payLaterAllowed(user.isPayLaterAllowed())
            .payoutPercentage(user.getPayoutPercentage())
            .cancellationPolicy(user.getCancellationPolicy())
            .hostedProperties(
                user.getHostedProperties() != null
                    ? new java.util.ArrayList<>(user.getHostedProperties())
                    : java.util.List.of()
            )
            .totalListings(user.getTotalListings())
            .averageRating(user.getAverageRating())
            .reviewCount(user.getReviewCount())
            .responseRate(user.getResponseRate())
            .cleanlinessRating(user.getCleanlinessRating())
            .accuracyRating(user.getAccuracyRating())
            .checkInRating(user.getCheckInRating())
            .communicationRating(user.getCommunicationRating())
            .locationRating(user.getLocationRating())
            .valueRating(user.getValueRating())
            .lastLoginAt(user.getLastLoginAt())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .build();
    }

    private UserAccessResponse mapToAccessResponse(User user) {
        return UserAccessResponse.builder()
            .userId(user.getUserId())
            .email(user.getEmail())
            .role(user.getRole())
            .status(user.getStatus())
            .emailVerified(user.isEmailVerified())
            .verificationStatus(user.getVerificationStatus())
            .canBook(canBook(user))
            .canHost(canHost(user))
            .build();
    }

    private boolean canBook(User user) {
        return user.getStatus() == UserStatus.ACTIVE && user.isEmailVerified();
    }

    private boolean canHost(User user) {
        return user.getRole() == Role.HOST && canBook(user);
    }
}

