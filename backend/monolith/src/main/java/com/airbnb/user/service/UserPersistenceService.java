package com.airbnb.user.service;

import com.airbnb.user.model.User;
import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.UserStatus;
import com.airbnb.user.model.enums.VerificationStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserPersistenceService {

    public static final String LEGACY_USERS_COLLECTION = "users";
    public static final String GUESTS_COLLECTION = "guests";
    public static final String HOSTS_COLLECTION = "hosts";
    public static final String ADMINS_COLLECTION = "admins";

    private final MongoTemplate mongoTemplate;

    public User save(User user) {
        return mongoTemplate.save(user, getCollectionName(user.getRole()));
    }

    public Optional<User> findByEmail(String email) {
        Query query = Query.query(Criteria.where("email").is(email));
        return findFirst(query);
    }

    public Optional<User> findByUserId(String userId) {
        Query query = Query.query(Criteria.where("userId").is(userId));
        return findFirst(query);
    }

    public boolean existsByEmail(String email) {
        Query query = Query.query(Criteria.where("email").is(email));
        return (
            mongoTemplate.exists(query, User.class, GUESTS_COLLECTION) ||
            mongoTemplate.exists(query, User.class, HOSTS_COLLECTION) ||
            mongoTemplate.exists(query, User.class, ADMINS_COLLECTION)
        );
    }

    public List<User> findAll() {
        List<User> users = new ArrayList<>();
        users.addAll(mongoTemplate.findAll(User.class, GUESTS_COLLECTION));
        users.addAll(mongoTemplate.findAll(User.class, HOSTS_COLLECTION));
        users.addAll(mongoTemplate.findAll(User.class, ADMINS_COLLECTION));
        return users;
    }

    public org.springframework.data.domain.Page<User> findHosts(
        String location,
        int page,
        int size
    ) {
        Query query = new Query();

        // 1. Base Filters (Active & Verified Hosts)
        query.addCriteria(Criteria.where("status").is(UserStatus.ACTIVE));
        query.addCriteria(Criteria.where("emailVerified").is(true));
        query.addCriteria(
            Criteria.where("verificationStatus").is(VerificationStatus.APPROVED)
        );

        // 2. Location Filter (if provided)
        if (org.springframework.util.StringUtils.hasText(location)) {
            String regex =
                ".*" + java.util.regex.Pattern.quote(location.trim()) + ".*";
            query.addCriteria(
                new Criteria().orOperator(
                    Criteria.where("city").regex(regex, "i"),
                    Criteria.where("country").regex(regex, "i"),
                    Criteria.where("district").regex(regex, "i"),
                    Criteria.where("division").regex(regex, "i"),
                    Criteria.where("area").regex(regex, "i"),
                    Criteria.where("village").regex(regex, "i"),
                    Criteria.where("street").regex(regex, "i"),
                    Criteria.where("hostDisplayName").regex(regex, "i"),
                    Criteria.where("hostAbout").regex(regex, "i")
                )
            );
        }

        // 3. Count Total (before pagination)
        long total = mongoTemplate.count(query, User.class, HOSTS_COLLECTION);

        // 4. Pagination
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(page, size);
        query.with(pageable);

        // 5. Execute
        List<User> hosts = mongoTemplate.find(
            query,
            User.class,
            HOSTS_COLLECTION
        );

        return new org.springframework.data.domain.PageImpl<>(
            hosts,
            pageable,
            total
        );
    }

    public List<User> findAllHosts() {
        return mongoTemplate.findAll(User.class, HOSTS_COLLECTION);
    }

    public long countHosts() {
        return mongoTemplate.count(new Query(), User.class, HOSTS_COLLECTION);
    }

    public List<User> findAllLegacyUsers() {
        if (!mongoTemplate.collectionExists(LEGACY_USERS_COLLECTION)) {
            return List.of();
        }
        return mongoTemplate.findAll(User.class, LEGACY_USERS_COLLECTION);
    }

    public boolean legacyCollectionExists() {
        return mongoTemplate.collectionExists(LEGACY_USERS_COLLECTION);
    }

    public void dropLegacyUsersCollection() {
        if (legacyCollectionExists()) {
            mongoTemplate.dropCollection(LEGACY_USERS_COLLECTION);
        }
    }

    public String getCollectionName(Role role) {
        return switch (role) {
            case HOST -> HOSTS_COLLECTION;
            case ADMIN -> ADMINS_COLLECTION;
            case GUEST -> GUESTS_COLLECTION;
        };
    }

    public Optional<User> findByEmailAndPhoneNumber(String email, String phoneNumber) {
        Query query = Query.query(
            Criteria.where("email").is(email)
                .and("phoneNumber").is(phoneNumber)
        );
        return findFirst(query);
    }

    private Optional<User> findFirst(Query query) {
        User admin = mongoTemplate.findOne(
            query,
            User.class,
            ADMINS_COLLECTION
        );
        if (admin != null) {
            return Optional.of(admin);
        }

        User host = mongoTemplate.findOne(query, User.class, HOSTS_COLLECTION);
        if (host != null) {
            return Optional.of(host);
        }

        User guest = mongoTemplate.findOne(
            query,
            User.class,
            GUESTS_COLLECTION
        );
        return Optional.ofNullable(guest);
    }
}
