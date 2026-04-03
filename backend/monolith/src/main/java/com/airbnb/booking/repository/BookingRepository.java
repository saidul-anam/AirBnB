package com.airbnb.booking.repository;

import com.airbnb.booking.model.Booking;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findByHostId(String hostId);
    List<Booking> findByGuestId(String guestId);
}
