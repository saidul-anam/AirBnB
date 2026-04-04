package com.airbnb.monolith.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.airbnb.booking.repository",
    mongoTemplateRef = "bookingMongoTemplate"
)
public class BookingMongoConfig {}
