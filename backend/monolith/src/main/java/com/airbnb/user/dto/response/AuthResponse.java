package com.airbnb.user.dto.response;

import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.VerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private String profileImage;
    private boolean emailVerified;
    private VerificationStatus verificationStatus;
    private boolean canBook;
    private boolean canHost;
    private java.util.List<String> favoriteHostIds;
    private String message;
}
