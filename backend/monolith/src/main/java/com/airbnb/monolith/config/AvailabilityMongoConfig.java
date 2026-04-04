package com.airbnb.monolith.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.airbnb.availability.repository",
    mongoTemplateRef = "availabilityMongoTemplate"
)
public class AvailabilityMongoConfig {}
