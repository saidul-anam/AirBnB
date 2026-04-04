package com.airbnb.monolith.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

import com.mongodb.client.MongoClients;

@Configuration
public class MultipleMongoConfig {

    @Value("${spring.data.mongodb.user.uri}")
    private String userDbUri;

    @Value("${spring.data.mongodb.booking.uri}")
    private String bookingDbUri;

    @Value("${spring.data.mongodb.review.uri}")
    private String reviewDbUri;

    @Value("${spring.data.mongodb.notification.uri}")
    private String notificationDbUri;

    @Value("${spring.data.mongodb.availability.uri}")
    private String availabilityDbUri;

    @Primary
    @Bean(name = "userMongoTemplate")
    public MongoTemplate userMongoTemplate() {
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(userDbUri));
    }

    @Bean(name = "bookingMongoTemplate")
    public MongoTemplate bookingMongoTemplate() {
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(bookingDbUri));
    }

    @Bean(name = "reviewMongoTemplate")
    public MongoTemplate reviewMongoTemplate() {
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(reviewDbUri));
    }

    @Bean(name = "notificationMongoTemplate")
    public MongoTemplate notificationMongoTemplate() {
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(notificationDbUri));
    }

    @Bean(name = "availabilityMongoTemplate")
    public MongoTemplate availabilityMongoTemplate() {
        return new MongoTemplate(new SimpleMongoClientDatabaseFactory(availabilityDbUri));
    }
}
