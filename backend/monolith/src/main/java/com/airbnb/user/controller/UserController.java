package com.airbnb.user.controller;

import com.airbnb.user.dto.request.ChangePasswordRequest;
import com.airbnb.user.dto.request.UpdateProfileRequest;
import com.airbnb.user.dto.request.VerificationDecisionRequest;
import com.airbnb.user.dto.response.UserAccessResponse;
import com.airbnb.user.dto.response.UserProfileResponse;
import com.airbnb.user.dto.response.VerificationResponse;
import com.airbnb.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
        Authentication authentication
    ) {
        return ResponseEntity.ok(
            userService.getProfile(authentication.getName())
        );
    }

    @GetMapping("/me/access")
    public ResponseEntity<UserAccessResponse> getMyAccess(
        Authentication authentication
    ) {
        return ResponseEntity.ok(
            userService.getAccessProfile(authentication.getName())
        );
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
        Authentication authentication,
        @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(
            userService.updateProfile(authentication.getName(), request)
        );
    }

    @PutMapping("/me/password")
    public ResponseEntity<String> changeMyPassword(
        Authentication authentication,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(
            authentication.getName(),
            request.getCurrentPassword(),
            request.getNewPassword()
        );
        return ResponseEntity.ok("Password changed successfully");
    }

    @PostMapping("/me/resend-verification")
    public ResponseEntity<VerificationResponse> resendVerification(
        Authentication authentication
    ) {
        return ResponseEntity.ok(
            userService.resendVerificationEmail(authentication.getName())
        );
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserById(
        @PathVariable String userId
    ) {
        return ResponseEntity.ok(userService.getProfileByUserId(userId));
    }

    @GetMapping("/{userId}/access")
    public ResponseEntity<UserAccessResponse> getUserAccessById(
        @PathVariable String userId
    ) {
        return ResponseEntity.ok(userService.getAccessProfileByUserId(userId));
    }

    @PutMapping("/host/{hostId}/rating")
    public ResponseEntity<Void> updateHostRating(
        @PathVariable String hostId,
        @RequestParam Double averageRating,
        @RequestParam(required = false) Double cleanlinessRating,
        @RequestParam(required = false) Double accuracyRating,
        @RequestParam(required = false) Double checkInRating,
        @RequestParam(required = false) Double communicationRating,
        @RequestParam(required = false) Double locationRating,
        @RequestParam(required = false) Double valueRating,
        @RequestParam(required = false) Integer reviewCount
    ) {
        userService.updateHostRating(
            hostId, averageRating, reviewCount,
            cleanlinessRating, accuracyRating, checkInRating,
            communicationRating, locationRating, valueRating
        );
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/hosts/suggestions")
    public ResponseEntity<List<UserProfileResponse>> getHostSuggestions(
        @RequestParam(defaultValue = "") String location,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(
            userService.getHostSuggestions(location, page, limit)
                .getContent()
        );
    }

    @PutMapping("/admin/{userId}/suspend")
    public ResponseEntity<String> suspendUser(@PathVariable String userId) {
        userService.suspendUser(userId);
        return ResponseEntity.ok("User suspended successfully");
    }

    @PutMapping("/admin/{userId}/activate")
    public ResponseEntity<String> activateUser(@PathVariable String userId) {
        userService.activateUser(userId);
        return ResponseEntity.ok("User activated successfully");
    }

    @PutMapping("/admin/{userId}/approve-verification")
    public ResponseEntity<VerificationResponse> approveVerification(
        @PathVariable String userId,
        @RequestBody(required = false) VerificationDecisionRequest request
    ) {
        return ResponseEntity.ok(
            userService.approveVerification(
                userId,
                request != null ? request.getNote() : null
            )
        );
    }

    @PutMapping("/admin/{userId}/reject-verification")
    public ResponseEntity<VerificationResponse> rejectVerification(
        @PathVariable String userId,
        @RequestBody(required = false) VerificationDecisionRequest request
    ) {
        return ResponseEntity.ok(
            userService.rejectVerification(
                userId,
                request != null ? request.getNote() : null
            )
        );
    }
}
