package com.airbnb.user.seed;

import com.airbnb.user.model.User;
import com.airbnb.user.model.HostedProperty;
import com.airbnb.user.model.enums.Role;
import com.airbnb.user.model.enums.UserStatus;
import com.airbnb.user.model.enums.VerificationStatus;
import com.airbnb.user.service.UserPersistenceService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class HostSeeder implements CommandLineRunner {

    private record SeedLocation(
        String street,
        String area,
        String village,
        String district,
        String division,
        String city,
        String country,
        String zipCode,
        double latitude,
        double longitude
    ) {}

    private record SeedCredential(String email, String password) {}

    private final UserPersistenceService userPersistenceService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Default to true for development convenience as requested
        boolean enabled = parseBoolean("HOST_SEED_ENABLED", true);
        if (!enabled) return;

        int targetCount = parseInt("HOST_SEED_COUNT", 400);
        long currentCount = userPersistenceService.countHosts();

        if (currentCount >= targetCount) {
            log.info(
                "Host seeding skipped. Found {} hosts, target is {}.",
                currentCount,
                targetCount
            );
            return;
        }

        int count = targetCount - (int) currentCount;
        log.info(
            "Seeding {} more hosts to reach target of {} (current={})",
            count,
            targetCount,
            currentCount
        );

        String imageDirRaw = firstNonBlank(
            System.getProperty("HOST_IMAGE_TRAINING_DIR"),
            System.getenv("HOST_IMAGE_TRAINING_DIR")
        );

        List<String> availableImages = new ArrayList<>();

        if (imageDirRaw != null) {
            Path imageDir = Paths.get(imageDirRaw);
            if (Files.exists(imageDir)) {
                List<Path> files = listImages(imageDir);
                if (!files.isEmpty()) {
                    for (Path p : files) {
                        try {
                            availableImages.add(toDataUrl(p));
                        } catch (Exception e) {
                            log.warn("Failed to read image {}", p, e);
                        }
                    }
                }
            }
        }

        // Fallback placeholders if no local images found
        if (availableImages.isEmpty()) {
            log.info(
                "No local images found in HOST_IMAGE_TRAINING_DIR. Using placeholders."
            );
            availableImages.addAll(
                List.of(
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1484154218962-a1c002085d2f?q=80&w=800&auto=format&fit=crop"
                )
            );
        }

        String outputRaw = firstNonBlank(
            System.getProperty("HOST_PASSWORDS_OUT"),
            System.getenv("HOST_PASSWORDS_OUT")
        );
        Path outputPath = Paths.get(
            outputRaw == null ? "host_seed_passwords.txt" : outputRaw
        );

        List<SeedLocation> locations = defaultLocations();
        Random random = new Random(System.currentTimeMillis());

        List<SeedCredential> credentials = new ArrayList<>();
        int inserted = 0;
        int attempts = 0;

        // generate until we reach the desired count (skip already-existing emails)
        while (inserted < count && attempts < count * 20) {
            attempts++;

            int index = inserted + attempts;
            SeedLocation loc = locations.get(random.nextInt(locations.size()));

            String firstName = randomFirstName(random, loc.country);
            String lastName = randomLastName(random, loc.country);

            String email = (
                firstName.toLowerCase(Locale.ROOT) +
                "." +
                lastName.toLowerCase(Locale.ROOT) +
                index +
                "@airbnb.local"
            ).toLowerCase(Locale.ROOT);
            String password = "Host" + (1000 + index) + "!";
            String normalizedEmail = email.toLowerCase(Locale.ROOT);

            if (userPersistenceService.existsByEmail(normalizedEmail)) {
                continue;
            }

            // Removed duplicate loc declaration

            String profileImage = availableImages.get(
                random.nextInt(availableImages.size())
            );
            List<String> portfolioImages = List.of(
                availableImages.get(random.nextInt(availableImages.size())),
                availableImages.get(random.nextInt(availableImages.size()))
            );

            List<String> propertyTypesOffered = pickManyDistinct(
                random,
                List.of(
                    "Apartment",
                    "Condo",
                    "House",
                    "Guest suite",
                    "Villa",
                    "Cottage",
                    "Tiny home"
                ),
                2,
                3
            );

            List<String> bedTypes = pickManyDistinct(
                random,
                List.of(
                    "KING_BED",
                    "QUEEN_BED",
                    "TWIN_BED",
                    "DOUBLE_BED",
                    "SOFA_BED"
                ),
                1,
                2
            );

            List<String> offeringHighlights = pickManyDistinct(
                random,
                List.of(
                    "Fast Wi-Fi",
                    "Free parking",
                    "Self check-in",
                    "Great kitchen",
                    "Air conditioning",
                    "Workspace",
                    "Family friendly",
                    "City view"
                ),
                3,
                4
            );

            boolean superhost = random.nextDouble() < 0.18d;

            int guestCapacity = 1 + random.nextInt(8);
            int bedCount = 1 + random.nextInt(6);
            double nightlyRateUsd =
                35 + random.nextInt(170) + random.nextDouble();

            int reviewCount = 10 + random.nextInt(220);
            double averageRating = 4.55 + random.nextDouble() * 0.4;
            // responseRate in this app is displayed as a raw double, so we keep it 80-100
            double responseRate = 85 + random.nextDouble() * 15;
            
            // Host stats - declare hostingSinceDate first
            LocalDateTime now = LocalDateTime.now();
            LocalDate hostingSinceDate = LocalDate.now().minusDays(
                30L * (2 + random.nextInt(36))
            );
            
            // Review score breakdown (like Airbnb)
            double cleanlinessScore = 4.5 + random.nextDouble() * 0.5;
            double accuracyScore = 4.5 + random.nextDouble() * 0.5;
            double checkInScore = 4.6 + random.nextDouble() * 0.4;
            double communicationScore = 4.6 + random.nextDouble() * 0.4;
            double locationScore = 4.4 + random.nextDouble() * 0.6;
            double valueScore = 4.3 + random.nextDouble() * 0.7;
            
            // Calculate years hosting
            int yearsHosting = (int) ((System.currentTimeMillis() - hostingSinceDate.atStartOfDay().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()) / (1000L * 60 * 60 * 24 * 365));
            String languagesSpoken = pickManyDistinct(random, 
                List.of("English", "Spanish", "French", "German", "Italian", "Japanese", "Chinese", "Arabic", "Hindi", "Portuguese"), 1, 3)
                .stream().collect(java.util.stream.Collectors.joining(", "));
            String responseTime = random.nextDouble() < 0.5 ? "Within an hour" : "Within a few hours";

            // Build 1-3 hosted properties for this host
            int numProperties = 1 + random.nextInt(3);
            List<String> allPropTypes = List.of("Apartment", "Home", "Hotel", "Villa", "Cottage", "Guest Suite", "Tiny Home");
            List<String> allPolicies = List.of("FLEXIBLE", "MODERATE", "STRICT");
            List<HostedProperty> hostedProperties = new ArrayList<>();
            for (int p = 0; p < numProperties; p++) {
                String propType = allPropTypes.get(random.nextInt(allPropTypes.size()));
                double propRate = 30 + random.nextInt(200) + random.nextDouble();
                int propGuests = 1 + random.nextInt(8);
                int propBeds = 1 + random.nextInt(5);
                List<String> propBedTypes = pickManyDistinct(random,
                    List.of("KING_BED", "QUEEN_BED", "TWIN_BED", "DOUBLE_BED", "SOFA_BED"), 1, 2);
                List<String> propAmenities = pickManyDistinct(random,
                    List.of("Free Wi-Fi", "Air conditioning", "Kitchen", "Free parking",
                            "TV", "Washer", "Dryer", "Pool", "Hot tub", "Gym"), 3, 6);
                
                // What this place offers (expanded amenities)
                List<String> propEssentials = pickManyDistinct(random,
                    List.of("Kitchen", "Wifi", "TV", "Heating", "Air conditioning", "Iron", "Hair dryer", "Dedicated workspace"), 3, 5);
                List<String> propFeatures = pickManyDistinct(random,
                    List.of("Pool", "Hot tub", "Gym", "Free parking", "EV charger", "BBQ grill", "Outdoor furniture", "Fire pit", "Piano", "Pool table"), 2, 4);
                List<String> propSafety = pickManyDistinct(random,
                    List.of("Smoke alarm", "Carbon monoxide alarm", "Fire extinguisher", "First aid kit", "Security cameras", "Lock on bedroom door"), 2, 3);
                
                // Property review scores
                double propCleanlinessScore = 4.5 + random.nextDouble() * 0.5;
                double propAccuracyScore = 4.5 + random.nextDouble() * 0.5;
                double propCheckInScore = 4.6 + random.nextDouble() * 0.4;
                double propCommunicationScore = 4.6 + random.nextDouble() * 0.4;
                double propLocationScore = 4.4 + random.nextDouble() * 0.6;
                double propValueScore = 4.3 + random.nextDouble() * 0.7;
                double propAvgRating = (propCleanlinessScore + propAccuracyScore + propCheckInScore + propCommunicationScore + propLocationScore + propValueScore) / 6.0;
                int propReviewCount = 5 + random.nextInt(100);
                
                String propPolicy = allPolicies.get(random.nextInt(allPolicies.size()));
                boolean propPayLater = random.nextDouble() < 0.4;
                List<String> propImages = List.of(
                    availableImages.get(random.nextInt(availableImages.size())),
                    availableImages.get(random.nextInt(availableImages.size()))
                );
                hostedProperties.add(HostedProperty.builder()
                    .propertyName(firstName + "'s " + propType + " in " + loc.area)
                    .propertyType(propType)
                    .description("A lovely " + propType.toLowerCase() + " in " + loc.area +
                        ", " + loc.city + ". Perfect for travelers seeking comfort and convenience.")
                    .street(loc.street)
                    .area(loc.area)
                    .district(loc.district)
                    .city(loc.city)
                    .country(loc.country)
                    .guestCapacity(propGuests)
                    .bedCount(propBeds)
                    .bedTypes(propBedTypes)
                    .nightlyRateUsd(propRate)
                    .amenities(propAmenities)
                    .essentials(propEssentials)
                    .features(propFeatures)
                    .safety(propSafety)
                    .images(propImages)
                    .payLaterAllowed(propPayLater)
                    .cancellationPolicy(propPolicy)
                    .averageRating(propAvgRating)
                    .reviewCount(propReviewCount)
                    .cleanlinessRating(propCleanlinessScore)
                    .accuracyRating(propAccuracyScore)
                    .checkInRating(propCheckInScore)
                    .communicationRating(propCommunicationScore)
                    .locationRating(propLocationScore)
                    .valueRating(propValueScore)
                    .build());
            }

            String cancellationPolicy = allPolicies.get(random.nextInt(allPolicies.size()));
            double payoutPercentage = 70 + random.nextInt(20) + random.nextDouble(); // 70-90%
            boolean payLaterAllowed = random.nextDouble() < 0.5;

            User host = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .phoneNumber("01" + (10000000 + random.nextInt(80000000)))
                .role(Role.HOST)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .verificationStatus(VerificationStatus.APPROVED)
                .verificationRequestedAt(now.minusDays(20))
                .verifiedAt(now.minusDays(5))
                .superhost(superhost)
                .profileImage(profileImage)
                .bio(
                    superhost
                        ? "Superhost-ready space with warm hospitality and fast responses."
                        : "Comfortable, clean stays with practical amenities and clear check-in details."
                )
                .street(loc.street)
                .area(loc.area)
                .village(loc.village)
                .district(loc.district)
                .division(loc.division)
                .city(loc.city)
                .country(loc.country)
                .zipCode(loc.zipCode)
                .latitude(loc.latitude + jitter(random))
                .longitude(loc.longitude + jitter(random))
                .hostDisplayName(firstName + "'s " + loc.area + " Retreat")
                .hostAbout(
                    "A cozy place designed for travelers. Expect a relaxing vibe, reliable Wi-Fi, and a smooth check-in."
                )
                .hostingSince(hostingSinceDate.atStartOfDay())
                .preferredCheckInTime("14:00")
                .preferredCheckOutTime("11:00")
                .responseTimeHours(1 + random.nextInt(7))
                .houseRules(
                    "No smoking. Quiet hours 10pm-7am. Please treat the space with respect."
                )
                .propertyTypesOffered(propertyTypesOffered)
                .offeringHighlights(offeringHighlights)
                .hostPortfolioImages(portfolioImages)
                .guestCapacity(guestCapacity)
                .bedCount(bedCount)
                .bedTypes(bedTypes)
                .nightlyRateUsd(nightlyRateUsd)
                .payLaterAllowed(payLaterAllowed)
                .payoutPercentage(Math.round(payoutPercentage * 10.0) / 10.0)
                .cancellationPolicy(cancellationPolicy)
                .hostedProperties(hostedProperties)
                .totalListings(hostedProperties.size())
                .averageRating(averageRating)
                .reviewCount(reviewCount)
                .responseRate(responseRate)
                .cleanlinessRating(cleanlinessScore)
                .accuracyRating(accuracyScore)
                .checkInRating(checkInScore)
                .communicationRating(communicationScore)
                .locationRating(locationScore)
                .valueRating(valueScore)
                .yearsHosting(yearsHosting)
                .languagesSpoken(languagesSpoken)
                .responseTime(responseTime)
                .lastLoginAt(now.minusDays(random.nextInt(20)))
                .createdAt(now)
                .updatedAt(now)
                .build();

            userPersistenceService.save(host);
            credentials.add(new SeedCredential(normalizedEmail, password));
            inserted++;
            log.info(
                "Seeded host {}/{}: {} ({})",
                inserted,
                count,
                normalizedEmail,
                loc.district
            );
        }

        credentials = credentials
            .stream()
            .sorted(Comparator.comparing(SeedCredential::email))
            .collect(Collectors.toList());

        try {
            List<String> lines = new ArrayList<>();
            lines.add("email,password");
            credentials.forEach(c -> lines.add(c.email + "," + c.password));
            Files.write(outputPath, lines);
        } catch (IOException e) {
            throw new RuntimeException(
                "Failed to write passwords file: " + outputPath,
                e
            );
        }

        log.info(
            "Host seeding finished. Inserted={}, passwordsWrittenTo={}",
            inserted,
            outputPath.toAbsolutePath()
        );
    }

    private static double jitter(Random random) {
        // +/- 0.02 range (keeps cards localized while still varied)
        return (random.nextDouble() - 0.5d) * 0.04d;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }

    private boolean parseBoolean(String key, boolean defaultValue) {
        String val = System.getProperty(key);
        if (val == null || val.isBlank()) val = System.getenv(key);
        if (val == null || val.isBlank()) return defaultValue;
        return Boolean.parseBoolean(val.trim());
    }

    private int parseInt(String key, int defaultValue) {
        String val = System.getProperty(key);
        if (val == null || val.isBlank()) val = System.getenv(key);
        if (val == null || val.isBlank()) return defaultValue;
        return Integer.parseInt(val.trim());
    }

    private static List<Path> listImages(Path root) {
        try {
            return Files.walk(root)
                .filter(Files::isRegularFile)
                .filter(p -> {
                    String name = p
                        .getFileName()
                        .toString()
                        .toLowerCase(Locale.ROOT);
                    return (
                        name.endsWith(".jpg") ||
                        name.endsWith(".jpeg") ||
                        name.endsWith(".png") ||
                        name.endsWith(".webp")
                    );
                })
                .collect(Collectors.toList());
        } catch (IOException e) {
            throw new RuntimeException("Failed to list images from " + root, e);
        }
    }

    private static String toDataUrl(Path path) {
        try {
            byte[] bytes = Files.readAllBytes(path);
            String mime = guessMime(path);
            String base64 = Base64.getEncoder().encodeToString(bytes);
            return "data:" + mime + ";base64," + base64;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image: " + path, e);
        }
    }

    private static String guessMime(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private static List<SeedLocation> defaultLocations() {
        return List.of(
            // Bangladesh
            new SeedLocation(
                "Road 27",
                "Gulshan",
                "Gulshan 1",
                "Dhaka District",
                "Dhaka Division",
                "Dhaka",
                "Bangladesh",
                "1212",
                23.7920,
                90.4146
            ),
            new SeedLocation(
                "Dhanmondi Rd",
                "Dhanmondi",
                "Dhanmondi",
                "Dhaka District",
                "Dhaka Division",
                "Dhaka",
                "Bangladesh",
                "1205",
                23.7480,
                90.3760
            ),
            new SeedLocation(
                "Mirpur 10",
                "Mirpur",
                "Kafrul",
                "Dhaka District",
                "Dhaka Division",
                "Dhaka",
                "Bangladesh",
                "1216",
                23.8067,
                90.3600
            ),
            new SeedLocation(
                "Ambarkhana",
                "Sylhet City",
                "Sadar",
                "Sylhet District",
                "Sylhet Division",
                "Sylhet",
                "Bangladesh",
                "3100",
                24.8949,
                91.8687
            ),
            new SeedLocation(
                "GEC Circle",
                "Chattogram",
                "Pahartali",
                "Chattogram District",
                "Chattogram Division",
                "Chittagong",
                "Bangladesh",
                "4000",
                22.3569,
                91.7832
            ),
            new SeedLocation(
                "Marine Drive",
                "Cox's Bazar",
                "Kolatoli",
                "Cox's Bazar District",
                "Chattogram Division",
                "Cox's Bazar",
                "Bangladesh",
                "4700",
                21.4272,
                91.9702
            ),
            // Thailand
            new SeedLocation(
                "Sukhumvit Rd",
                "Watthana",
                "Khlong Toei",
                "Bangkok",
                "Central",
                "Bangkok",
                "Thailand",
                "10110",
                13.7563,
                100.5018
            ),
            new SeedLocation(
                "Patong Beach",
                "Kathu",
                "Patong",
                "Phuket",
                "South",
                "Phuket",
                "Thailand",
                "83150",
                7.8804,
                98.3923
            ),
            new SeedLocation(
                "Nimmanhemin Rd",
                "Suthep",
                "Mueang",
                "Chiang Mai",
                "North",
                "Chiang Mai",
                "Thailand",
                "50200",
                18.7883,
                98.9853
            ),
            // Pakistan
            new SeedLocation(
                "MM Alam Rd",
                "Gulberg",
                "Gulberg III",
                "Lahore",
                "Punjab",
                "Lahore",
                "Pakistan",
                "54000",
                31.5204,
                74.3587
            ),
            new SeedLocation(
                "Clifton",
                "Saddar",
                "Clifton",
                "Karachi",
                "Sindh",
                "Karachi",
                "Pakistan",
                "75600",
                24.8607,
                67.0011
            ),
            new SeedLocation(
                "F-7 Markaz",
                "F-7",
                "Islamabad",
                "Islamabad",
                "Islamabad",
                "Islamabad",
                "Pakistan",
                "44000",
                33.6844,
                73.0479
            ),
            // Japan
            new SeedLocation(
                "Shibuya Crossing",
                "Shibuya",
                "Shibuya City",
                "Tokyo",
                "Kanto",
                "Tokyo",
                "Japan",
                "150-0002",
                35.6580,
                139.7016
            ),
            new SeedLocation(
                "Gion",
                "Higashiyama",
                "Kyoto City",
                "Kyoto",
                "Kansai",
                "Kyoto",
                "Japan",
                "605-0073",
                35.0035,
                135.7792
            ),
            new SeedLocation(
                "Dotonbori",
                "Chuo",
                "Osaka City",
                "Osaka",
                "Kansai",
                "Osaka",
                "Japan",
                "542-0071",
                34.6937,
                135.5023
            ),
            // China
            new SeedLocation(
                "Wangfujing",
                "Dongcheng",
                "Beijing",
                "Beijing",
                "North",
                "Beijing",
                "China",
                "100006",
                39.9042,
                116.4074
            ),
            new SeedLocation(
                "The Bund",
                "Huangpu",
                "Shanghai",
                "Shanghai",
                "East",
                "Shanghai",
                "China",
                "200002",
                31.2304,
                121.4737
            ),
            // India
            new SeedLocation(
                "Connaught Place",
                "New Delhi",
                "Delhi",
                "Delhi",
                "North",
                "Delhi",
                "India",
                "110001",
                28.6139,
                77.2090
            ),
            new SeedLocation(
                "Bandra West",
                "Bandra",
                "Mumbai Suburban",
                "Mumbai",
                "Maharashtra",
                "Mumbai",
                "India",
                "400050",
                19.0760,
                72.8777
            ),
            new SeedLocation(
                "Calangute Beach",
                "Calangute",
                "North Goa",
                "Goa",
                "Goa",
                "Goa",
                "India",
                "403516",
                15.2993,
                74.1240
            ),
            // Turkey
            new SeedLocation(
                "Taksim Square",
                "Beyoglu",
                "Istanbul",
                "Istanbul",
                "Marmara",
                "Istanbul",
                "Turkey",
                "34435",
                41.0082,
                28.9784
            ),
            new SeedLocation(
                "Lara Beach",
                "Muratpasa",
                "Antalya",
                "Antalya",
                "Mediterranean",
                "Antalya",
                "Turkey",
                "07230",
                36.8969,
                30.7133
            ),
            // USA
            new SeedLocation(
                "Broadway",
                "Manhattan",
                "New York",
                "New York",
                "NY",
                "New York",
                "USA",
                "10036",
                40.7128,
                -74.0060
            ),
            new SeedLocation(
                "Hollywood Blvd",
                "Hollywood",
                "Los Angeles",
                "Los Angeles",
                "CA",
                "Los Angeles",
                "USA",
                "90028",
                34.0522,
                -118.2437
            ),
            // UK
            new SeedLocation(
                "Oxford Street",
                "Westminster",
                "London",
                "London",
                "Greater London",
                "London",
                "UK",
                "W1D 1BS",
                51.5074,
                -0.1278
            ),
            // Italy
            new SeedLocation(
                "Via del Corso",
                "Centro Storico",
                "Rome",
                "Rome",
                "Lazio",
                "Rome",
                "Italy",
                "00186",
                41.9028,
                12.4964
            ),
            new SeedLocation(
                "San Marco",
                "San Marco",
                "Venice",
                "Venice",
                "Veneto",
                "Venice",
                "Italy",
                "30124",
                45.4408,
                12.3155
            ),
            // Vietnam
            new SeedLocation(
                "Old Quarter",
                "Hoan Kiem",
                "Hanoi",
                "Hanoi",
                "North",
                "Hanoi",
                "Vietnam",
                "100000",
                21.0285,
                105.8542
            ),
            new SeedLocation(
                "District 1",
                "Ben Nghe",
                "Ho Chi Minh",
                "Ho Chi Minh",
                "South",
                "Ho Chi Minh City",
                "Vietnam",
                "700000",
                10.8231,
                106.6297
            )
        );
    }

    private static String randomFirstName(Random random, String country) {
        // Diverse names based on regions (simplified)
        List<String> bangladeshi = List.of(
            "Ayesha",
            "Nusrat",
            "Faisal",
            "Farhan",
            "Tania",
            "Mahin",
            "Rakib",
            "Sadia",
            "Mehedi",
            "Rafi",
            "Zara",
            "Aiman",
            "Amir",
            "Nabila",
            "Sami"
        );
        List<String> thai = List.of(
            "Somchai",
            "Somsak",
            "Arthit",
            "Malee",
            "Ratana",
            "Siriporn",
            "Anong"
        );
        List<String> pakistani = List.of(
            "Ahmed",
            "Fatima",
            "Muhammad",
            "Zainab",
            "Bilal",
            "Aisha",
            "Omar",
            "Hassan"
        );
        List<String> japanese = List.of(
            "Haruto",
            "Yuto",
            "Sota",
            "Yui",
            "Rio",
            "Hina",
            "Sakura",
            "Kenji"
        );
        List<String> chinese = List.of(
            "Wei",
            "Fang",
            "Jing",
            "Lei",
            "Min",
            "Yang",
            "Li",
            "Jun"
        );
        List<String> indian = List.of(
            "Aarav",
            "Vihaan",
            "Aditya",
            "Saanvi",
            "Anya",
            "Diya",
            "Rohan",
            "Rahul"
        );
        List<String> western = List.of(
            "James",
            "Emma",
            "Olivia",
            "Liam",
            "Noah",
            "Sophia",
            "William",
            "Isabella",
            "Matteo",
            "Giulia"
        );

        if (country.equals("Bangladesh")) return bangladeshi.get(
            random.nextInt(bangladeshi.size())
        );
        if (country.equals("Thailand")) return thai.get(
            random.nextInt(thai.size())
        );
        if (country.equals("Pakistan")) return pakistani.get(
            random.nextInt(pakistani.size())
        );
        if (country.equals("Japan")) return japanese.get(
            random.nextInt(japanese.size())
        );
        if (country.equals("China")) return chinese.get(
            random.nextInt(chinese.size())
        );
        if (country.equals("India")) return indian.get(
            random.nextInt(indian.size())
        );
        if (
            List.of("USA", "UK", "Italy", "Turkey").contains(country)
        ) return western.get(random.nextInt(western.size()));

        return bangladeshi.get(random.nextInt(bangladeshi.size())); // Fallback
    }

    private static String randomLastName(Random random, String country) {
        List<String> bangladeshi = List.of(
            "Hossain",
            "Rahman",
            "Chowdhury",
            "Islam",
            "Uddin",
            "Mahmud",
            "Ahmed",
            "Khan",
            "Hasan",
            "Karim"
        );
        List<String> thai = List.of(
            "Saetang",
            "Saelee",
            "Srisai",
            "Charoen",
            "Wong"
        );
        List<String> pakistani = List.of(
            "Khan",
            "Ali",
            "Hussain",
            "Ahmed",
            "Malik",
            "Bhatti",
            "Raja"
        );
        List<String> japanese = List.of(
            "Sato",
            "Suzuki",
            "Takahashi",
            "Tanaka",
            "Watanabe",
            "Ito"
        );
        List<String> chinese = List.of(
            "Wang",
            "Li",
            "Zhang",
            "Liu",
            "Chen",
            "Yang",
            "Zhao"
        );
        List<String> indian = List.of(
            "Sharma",
            "Verma",
            "Gupta",
            "Malhotra",
            "Singh",
            "Patel",
            "Kumar"
        );
        List<String> western = List.of(
            "Smith",
            "Johnson",
            "Williams",
            "Brown",
            "Jones",
            "Rossi",
            "Ferrari",
            "Esposito"
        );

        if (country.equals("Bangladesh")) return bangladeshi.get(
            random.nextInt(bangladeshi.size())
        );
        if (country.equals("Thailand")) return thai.get(
            random.nextInt(thai.size())
        );
        if (country.equals("Pakistan")) return pakistani.get(
            random.nextInt(pakistani.size())
        );
        if (country.equals("Japan")) return japanese.get(
            random.nextInt(japanese.size())
        );
        if (country.equals("China")) return chinese.get(
            random.nextInt(chinese.size())
        );
        if (country.equals("India")) return indian.get(
            random.nextInt(indian.size())
        );
        if (
            List.of("USA", "UK", "Italy", "Turkey").contains(country)
        ) return western.get(random.nextInt(western.size()));

        return bangladeshi.get(random.nextInt(bangladeshi.size())); // Fallback
    }

    private static <T> List<T> pickManyDistinct(
        Random random,
        List<T> items,
        int minCount,
        int maxCount
    ) {
        int target = minCount;
        if (maxCount > minCount) {
            target = minCount + random.nextInt(maxCount - minCount + 1);
        }

        return items
            .stream()
            .sorted(Comparator.comparingInt(a -> random.nextInt(1000000)))
            .limit(target)
            .collect(Collectors.toList());
    }
}
