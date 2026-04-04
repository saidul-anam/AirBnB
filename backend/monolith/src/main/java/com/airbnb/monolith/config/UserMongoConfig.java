package com.airbnb.monolith.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.airbnb.user.repository",
    mongoTemplateRef = "userMongoTemplate"
)
public class UserMongoConfig {}
