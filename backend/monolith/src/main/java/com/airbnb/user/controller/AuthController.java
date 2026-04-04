package com.airbnb.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.airbnb.user.dto.request.ForgotPasswordRequest;
import com.airbnb.user.dto.request.LoginRequest;
import com.airbnb.user.dto.request.RegisterRequest;
import com.airbnb.user.dto.response.AuthResponse;
import com.airbnb.user.dto.response.VerificationResponse;
import com.airbnb.user.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
        @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(userService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
        @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(userService.login(request));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<VerificationResponse> verifyEmail(
        @RequestParam String token
    ) {
        return ResponseEntity.ok(userService.verifyEmail(token));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<VerificationResponse> forgotPassword(
        @Valid @RequestBody ForgotPasswordRequest request
    ) {
        return ResponseEntity.ok(userService.resetPassword(request));
    }
}
