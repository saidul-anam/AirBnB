package com.airbnb.admin.controller;

import com.airbnb.user.dto.request.VerificationDecisionRequest;
import com.airbnb.user.dto.response.UserProfileResponse;
import com.airbnb.admin.dto.response.VerificationActionResponse;
import com.airbnb.admin.dto.response.VerificationRequestSummaryResponse;
import com.airbnb.admin.service.AdminVerificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminVerificationController {

    private final AdminVerificationService adminVerificationService;

    @GetMapping("/verification-requests")
    public ResponseEntity<
        List<VerificationRequestSummaryResponse>
    > getPendingVerificationRequests(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(
            adminVerificationService.getPendingVerificationRequests(
                authorizationHeader
            )
        );
    }

    @PutMapping("/verification-requests/{userId}/approve")
    public ResponseEntity<VerificationActionResponse> approveVerification(
        @PathVariable String userId,
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody(required = false) VerificationDecisionRequest request
    ) {
        return ResponseEntity.ok(
            adminVerificationService.approveVerification(
                userId,
                authorizationHeader,
                request != null ? request.getNotificationId() : null,
                request != null ? request.getNote() : null
            )
        );
    }

    @PutMapping("/verification-requests/{userId}/reject")
    public ResponseEntity<VerificationActionResponse> rejectVerification(
        @PathVariable String userId,
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody(required = false) VerificationDecisionRequest request
    ) {
        return ResponseEntity.ok(
            adminVerificationService.rejectVerification(
                userId,
                authorizationHeader,
                request != null ? request.getNotificationId() : null,
                request != null ? request.getNote() : null
            )
        );
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(
            adminVerificationService.getAllUsers(authorizationHeader)
        );
    }
}

