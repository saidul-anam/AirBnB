package com.airbnb.monolith.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.airbnb.review.repository",
    mongoTemplateRef = "reviewMongoTemplate"
)
public class ReviewMongoConfig {}
