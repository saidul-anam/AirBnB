package com.airbnb.availability.seed;

import com.airbnb.availability.model.Availability;
import com.airbnb.availability.repository.AvailabilityRepository;
import com.airbnb.user.dto.response.UserProfileResponse;
import com.airbnb.user.service.UserService;
import com.airbnb.user.model.enums.Role;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AvailabilitySeeder implements CommandLineRunner {

    private final AvailabilityRepository availabilityRepository;
    private final UserService userService;

    @Override
    public void run(String... args) {
        if (availabilityRepository.count() > 0) {
            log.info("Availability data already exists. Skipping seed.");
            return;
        }

        log.info("Seeding availability data for existing hosts...");

        try {
            List<UserProfileResponse> hosts = userService.getAllUsers().stream()
                    .filter(u -> u.getRole() == Role.HOST)
                    .collect(Collectors.toList());

            log.info("Found {} hosts to seed availability for.", hosts.size());

            if (hosts.isEmpty()) {
                log.warn("No hosts found in userdb. Skipping availability seeding.");
                return;
            }

            List<Availability> availabilities = new ArrayList<>();
            Random random = new Random();
            LocalDate today = LocalDate.now();

            for (UserProfileResponse host : hosts) {
                String hostId = host.getUserId();

                Double nightlyRate = host.getNightlyRateUsd();
                BigDecimal basePrice = nightlyRate != null
                    ? BigDecimal.valueOf(nightlyRate)
                    : BigDecimal.valueOf(50 + random.nextInt(100));

                LocalDate currentDate = today;
                LocalDate oneYearLater = today.plusDays(365);

                while (currentDate.isBefore(oneYearLater)) {
                    boolean isAvailable = random.nextDouble() > 0.15; // 85% available chance

                    int blockLength = 1 + random.nextInt(isAvailable ? 14 : 5);
                    LocalDate blockEnd = currentDate.plusDays(blockLength).minusDays(1);

                    if (blockEnd.isAfter(oneYearLater)) {
                        blockEnd = oneYearLater;
                    }

                    BigDecimal currentPrice = basePrice;
                    if (isAvailable) {
                        if (random.nextDouble() > 0.7) {
                            currentPrice = basePrice.multiply(BigDecimal.valueOf(1.1 + random.nextDouble() * 0.2)); // 10-30% higher
                        }
                    }

                    Availability availability = Availability.builder()
                            .hostId(hostId)
                            .startDate(currentDate)
                            .endDate(blockEnd)
                            .isAvailable(isAvailable)
                            .price(currentPrice)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();

                    availabilities.add(availability);

                    currentDate = blockEnd.plusDays(1);
                }
            }

            if (!availabilities.isEmpty()) {
                log.info("Saving {} availability records...", availabilities.size());
                availabilityRepository.saveAll(availabilities);
                log.info("Availability seeding completed.");
            }
        } catch (Exception e) {
            log.error("Failed to seed availability", e);
            throw e;
        }
    }
}
