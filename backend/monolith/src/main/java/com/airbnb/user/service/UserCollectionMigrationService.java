package com.airbnb.user.service;

import com.airbnb.user.model.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserCollectionMigrationService {

    private final UserPersistenceService userPersistenceService;

    @EventListener(ApplicationReadyEvent.class)
    public void migrateLegacyUsersIfNeeded() {
        if (!userPersistenceService.legacyCollectionExists()) {
            return;
        }

        List<User> legacyUsers = userPersistenceService.findAllLegacyUsers();
        if (legacyUsers.isEmpty()) {
            userPersistenceService.dropLegacyUsersCollection();
            return;
        }

        for (User legacyUser : legacyUsers) {
            if (!userPersistenceService.existsByEmail(legacyUser.getEmail())) {
                userPersistenceService.save(legacyUser);
            }
        }

        userPersistenceService.dropLegacyUsersCollection();
        log.info(
            "Migrated {} legacy user records into role-based collections.",
            legacyUsers.size()
        );
    }
}
