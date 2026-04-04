package com.airbnb.user.dto.response;

import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.UserStatus;
import com.airbnb.user.model.enums.VerificationStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserAccessResponse {
    private String userId;
    private String email;
    private Role role;
    private UserStatus status;
    private boolean emailVerified;
    private VerificationStatus verificationStatus;
    private boolean canBook;
    private boolean canHost;
}
