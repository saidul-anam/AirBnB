package com.airbnb.availability.repository;

import com.airbnb.availability.model.Availability;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends MongoRepository<Availability, String> {
    List<Availability> findByHostId(String hostId);
    List<Availability> findByHostIdAndStartDateGreaterThanEqual(String hostId, LocalDate startDate);
}
